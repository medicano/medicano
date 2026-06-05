import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Professional,
  ProfessionalDocument,
} from '../professionals/schemas/professional.schema';
import {
  ClinicProfessional,
  ClinicProfessionalDocument,
} from '../professionals/schemas/clinic-professional.schema';
import { Clinic, ClinicDocument } from '../clinics/schemas/clinic.schema';
import {
  Subscription,
  SubscriptionDocument,
} from '../subscriptions/schemas/subscription.schema';
import { SearchQueryDto } from './dto/search-query.dto';

export interface ClinicResult {
  id: string;
  name: string;
  specialties: string[];
  city: string;
  phone: string;
  distance?: number;
}

export interface ProfessionalResult {
  id: string;
  name: string;
  specialty: string;
  city: string;
  clinicId: string;
  clinicName: string;
  distance?: number;
}

export interface SearchResult {
  clinics: ClinicResult[];
  professionals: ProfessionalResult[];
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

@Injectable()
export class SearchService {
  constructor(
    @InjectModel(Professional.name)
    private readonly professionalModel: Model<ProfessionalDocument>,
    @InjectModel(ClinicProfessional.name)
    private readonly clinicProfessionalModel: Model<ClinicProfessionalDocument>,
    @InjectModel(Clinic.name)
    private readonly clinicModel: Model<ClinicDocument>,
    @InjectModel(Subscription.name)
    private readonly subscriptionModel: Model<SubscriptionDocument>,
  ) {}

  async search(query: SearchQueryDto): Promise<SearchResult> {
    const activeSubscriptions = await this.subscriptionModel
      .find({ status: { $in: ['active', 'trial'] } })
      .select('clinicId')
      .lean()
      .exec();

    const activeClinicIds = new Set(
      activeSubscriptions.map((s) => (s.clinicId as Types.ObjectId).toString()),
    );

    const searchClinics = !query.type || query.type === 'all' || query.type === 'clinic';
    const searchProfessionals = !query.type || query.type === 'all' || query.type === 'professional';

    const [clinics, professionals] = await Promise.all([
      searchClinics ? this.searchClinics(query, activeClinicIds) : Promise.resolve([]),
      searchProfessionals ? this.searchProfessionals(query, activeClinicIds) : Promise.resolve([]),
    ]);

    return { clinics, professionals };
  }

  private async searchClinics(
    query: SearchQueryDto,
    activeClinicIds: Set<string>,
  ): Promise<ClinicResult[]> {
    const includedIds = [...activeClinicIds].map((id) => new Types.ObjectId(id));
    const filter: Record<string, unknown> = { _id: { $in: includedIds }, isActive: { $ne: false } };
    if (query.name) filter['name'] = { $regex: query.name, $options: 'i' };
    if (query.city) {
      // Clínica guarda a cidade em city (top-level) e em addressForm.city; o
      // endereço legado pode ter address.city. Casa qualquer um deles.
      const cityRegex = { $regex: query.city, $options: 'i' };
      filter['$or'] = [{ city: cityRegex }, { 'addressForm.city': cityRegex }, { 'address.city': cityRegex }];
    }
    if (query.specialty) filter['specialties'] = query.specialty;

    const docs = await this.clinicModel.find(filter).select('+lat +lng').lean().exec();

    const hasLocation = query.userLat != null && query.userLng != null;

    let results = docs.map((c) => {
      const result: ClinicResult = {
        id: (c._id as Types.ObjectId).toString(),
        name: c.name,
        specialties: (c.specialties as string[]) ?? [],
        city: (c as any).city ?? (c.address as any)?.city ?? '',
        phone: c.phone ?? '',
      };
      if (hasLocation && (c as any).lat && (c as any).lng) {
        result.distance = Math.round(haversineKm(query.userLat!, query.userLng!, (c as any).lat, (c as any).lng) * 10) / 10;
      }
      return result;
    });

    // Corte por raio: com localização e raio definidos, descarta o que está além
    // do limite — inclusive clínicas sem coordenadas, pois não dá para garantir
    // que estejam dentro do raio.
    if (hasLocation && query.radius != null) {
      results = results.filter((r) => r.distance != null && r.distance <= query.radius!);
    }

    if (hasLocation) {
      results.sort((a, b) => {
        if (a.distance == null) return 1;
        if (b.distance == null) return -1;
        return a.distance - b.distance;
      });
    }

    return results;
  }

  private async searchProfessionals(
    query: SearchQueryDto,
    activeClinicIds: Set<string>,
  ): Promise<ProfessionalResult[]> {
    // Todos os vínculos (qualquer clínica) — para saber quem é vinculado e quem é
    // autônomo (sem nenhum vínculo).
    const allLinks = await this.clinicProfessionalModel
      .find({})
      .select('clinicId professionalId')
      .lean()
      .exec();

    const linkedProfessionalIds = new Set<string>();
    const profToActiveClinicId = new Map<string, string>();
    for (const link of allLinks) {
      const profId = (link.professionalId as Types.ObjectId).toString();
      const clinicId = (link.clinicId as Types.ObjectId).toString();
      linkedProfessionalIds.add(profId);
      if (activeClinicIds.has(clinicId) && !profToActiveClinicId.has(profId)) {
        profToActiveClinicId.set(profId, clinicId);
      }
    }

    const professionalFilter: Record<string, unknown> = { isActive: { $ne: false } };
    if (query.specialty) professionalFilter['specialty'] = query.specialty;
    if (query.name) professionalFilter['name'] = { $regex: query.name, $options: 'i' };
    if (query.city) {
      // Cidade pode estar no endereço legado (address.city) ou no novo addressForm.
      const cityRegex = { $regex: query.city, $options: 'i' };
      professionalFilter['$or'] = [{ 'address.city': cityRegex }, { 'addressForm.city': cityRegex }];
    }

    const docs = await this.professionalModel.find(professionalFilter).lean().exec();
    // Aparece quem está vinculado a uma clínica com assinatura ativa OU quem é
    // autônomo (sem vínculo com nenhuma clínica). Vinculado só a clínica sem
    // assinatura ativa continua oculto.
    const filtered = docs.filter((p) => {
      const profId = (p._id as Types.ObjectId).toString();
      return profToActiveClinicId.has(profId) || !linkedProfessionalIds.has(profId);
    });

    const neededClinicIds = [...new Set([...profToActiveClinicId.values()])].map(
      (id) => new Types.ObjectId(id),
    );
    const clinicDocs = await this.clinicModel
      .find({ _id: { $in: neededClinicIds } })
      .select('name lat lng')
      .lean()
      .exec();
    const clinicNameMap = new Map(
      clinicDocs.map((c) => [(c._id as Types.ObjectId).toString(), c.name]),
    );

    const clinicCoordMap = new Map<string, { lat: number; lng: number }>();
    clinicDocs.forEach((c) => {
      if ((c as any).lat && (c as any).lng) {
        clinicCoordMap.set((c._id as Types.ObjectId).toString(), { lat: (c as any).lat, lng: (c as any).lng });
      }
    });

    const hasLocation = query.userLat != null && query.userLng != null;

    let results = filtered.map((p) => {
      const profId = (p._id as Types.ObjectId).toString();
      const clinicId = profToActiveClinicId.get(profId) ?? '';
      const result: ProfessionalResult = {
        id: profId,
        name: p.name as string,
        specialty: p.specialty as string,
        city: (p as any).addressForm?.city ?? (p.address as any)?.city ?? '',
        clinicId,
        clinicName: clinicNameMap.get(clinicId) ?? '',
      };
      if (hasLocation) {
        // Vinculado usa as coordenadas da clínica; autônomo usa as próprias.
        const coords = clinicId
          ? clinicCoordMap.get(clinicId)
          : (p as any).lat && (p as any).lng
            ? { lat: (p as any).lat, lng: (p as any).lng }
            : undefined;
        if (coords) {
          result.distance = Math.round(haversineKm(query.userLat!, query.userLng!, coords.lat, coords.lng) * 10) / 10;
        }
      }
      return result;
    });

    // Mesmo corte por raio das clínicas: a distância do profissional vem da
    // clínica vinculada, então sem coordenadas ele fica fora do raio.
    if (hasLocation && query.radius != null) {
      results = results.filter((r) => r.distance != null && r.distance <= query.radius!);
    }

    if (hasLocation) {
      results.sort((a, b) => {
        if (a.distance == null) return 1;
        if (b.distance == null) return -1;
        return a.distance - b.distance;
      });
    }

    return results;
  }
}

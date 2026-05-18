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
}

export interface ProfessionalResult {
  id: string;
  name: string;
  specialty: string;
  city: string;
  clinicId: string;
  clinicName: string;
}

export interface SearchResult {
  clinics: ClinicResult[];
  professionals: ProfessionalResult[];
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

    const activeClinicIds = activeSubscriptions.map((s) =>
      (s.clinicId as Types.ObjectId).toString(),
    );
    const activeClinicObjectIds = activeClinicIds.map((id) => new Types.ObjectId(id));

    const searchClinics = !query.type || query.type === 'all' || query.type === 'clinic';
    const searchProfessionals = !query.type || query.type === 'all' || query.type === 'professional';

    const [clinics, professionals] = await Promise.all([
      searchClinics ? this.searchClinics(query, activeClinicObjectIds) : Promise.resolve([]),
      searchProfessionals ? this.searchProfessionals(query, activeClinicObjectIds) : Promise.resolve([]),
    ]);

    return { clinics, professionals };
  }

  private async searchClinics(
    query: SearchQueryDto,
    activeClinicObjectIds: Types.ObjectId[],
  ): Promise<ClinicResult[]> {
    const filter: Record<string, unknown> = { _id: { $in: activeClinicObjectIds } };
    if (query.name) filter['name'] = { $regex: query.name, $options: 'i' };
    if (query.city) filter['address.city'] = { $regex: query.city, $options: 'i' };
    if (query.specialty) filter['specialties'] = query.specialty;

    const docs = await this.clinicModel.find(filter).lean().exec();

    return docs.map((c) => ({
      id: (c._id as Types.ObjectId).toString(),
      name: c.name,
      specialties: (c.specialties as string[]) ?? [],
      city: (c.address as any)?.city ?? '',
      phone: c.phone ?? '',
    }));
  }

  private async searchProfessionals(
    query: SearchQueryDto,
    activeClinicObjectIds: Types.ObjectId[],
  ): Promise<ProfessionalResult[]> {
    const links = await this.clinicProfessionalModel
      .find({ clinicId: { $in: activeClinicObjectIds } })
      .select('clinicId professionalId')
      .lean()
      .exec();

    const activeProfessionalIds = new Set(
      links.map((l) => (l.professionalId as Types.ObjectId).toString()),
    );

    const professionalFilter: Record<string, unknown> = {};
    if (query.specialty) professionalFilter['specialty'] = query.specialty;
    if (query.name) professionalFilter['name'] = { $regex: query.name, $options: 'i' };
    if (query.city) professionalFilter['address.city'] = { $regex: query.city, $options: 'i' };

    const docs = await this.professionalModel.find(professionalFilter).lean().exec();
    const filtered = docs.filter((p) =>
      activeProfessionalIds.has((p._id as Types.ObjectId).toString()),
    );

    const profToClinicId = new Map<string, string>();
    links.forEach((l) => {
      const profId = (l.professionalId as Types.ObjectId).toString();
      if (!profToClinicId.has(profId)) {
        profToClinicId.set(profId, (l.clinicId as Types.ObjectId).toString());
      }
    });

    const neededClinicIds = [...new Set([...profToClinicId.values()])].map(
      (id) => new Types.ObjectId(id),
    );
    const clinicDocs = await this.clinicModel
      .find({ _id: { $in: neededClinicIds } })
      .select('name')
      .lean()
      .exec();
    const clinicNameMap = new Map(
      clinicDocs.map((c) => [(c._id as Types.ObjectId).toString(), c.name]),
    );

    return filtered.map((p) => {
      const profId = (p._id as Types.ObjectId).toString();
      const clinicId = profToClinicId.get(profId) ?? '';
      return {
        id: profId,
        name: p.name as string,
        specialty: p.specialty as string,
        city: (p.address as any)?.city ?? '',
        clinicId,
        clinicName: clinicNameMap.get(clinicId) ?? '',
      };
    });
  }
}

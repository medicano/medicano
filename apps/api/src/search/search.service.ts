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
import {
  Subscription,
  SubscriptionDocument,
} from '../subscriptions/schemas/subscription.schema';
import { SearchQueryDto } from './dto/search-query.dto';
import { ProfessionalSearchResult } from './dto/search-result.dto';

@Injectable()
export class SearchService {
  constructor(
    @InjectModel(Professional.name)
    private readonly professionalModel: Model<ProfessionalDocument>,
    @InjectModel(ClinicProfessional.name)
    private readonly clinicProfessionalModel: Model<ClinicProfessionalDocument>,
    @InjectModel(Subscription.name)
    private readonly subscriptionModel: Model<SubscriptionDocument>,
  ) {}

  async search(query: SearchQueryDto): Promise<ProfessionalSearchResult[]> {
    const activeSubscriptions = await this.subscriptionModel
      .find({ status: 'active' })
      .select('clinicId')
      .lean()
      .exec();

    const activeClinicIds = activeSubscriptions.map((s) => {
      const id = s.clinicId;
      return typeof id === 'string' ? id : (id as Types.ObjectId).toString();
    });
    const activeClinicIdsSet = new Set(activeClinicIds);
    const activeClinicObjectIds = activeClinicIds.map((id) => new Types.ObjectId(id));

    const allLinks = await this.clinicProfessionalModel
      .find({ clinicId: { $in: activeClinicObjectIds } })
      .select('clinicId professionalId')
      .lean()
      .exec();

    const activeProfessionalIds = new Set(
      allLinks
        .filter((l) => activeClinicIdsSet.has((l.clinicId as Types.ObjectId).toString()))
        .map((l) => (l.professionalId as Types.ObjectId).toString()),
    );

    const filter: Record<string, unknown> = {};
    if (query.specialty) filter['specialty'] = query.specialty;
    if (query.name) filter['name'] = { $regex: query.name, $options: 'i' };
    if (query.city) filter['address.city'] = { $regex: query.city, $options: 'i' };

    const professionals = await this.professionalModel.find(filter).lean().exec();

    const filtered = professionals.filter((p) =>
      activeProfessionalIds.has((p._id as Types.ObjectId).toString()),
    );

    return filtered.map((p) => ({
      id: (p._id as Types.ObjectId).toString(),
      name: p.name as string,
      specialty: p.specialty as string,
      address: p.address as ProfessionalSearchResult['address'],
    }));
  }
}

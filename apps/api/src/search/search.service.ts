import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Professional, ProfessionalDocument } from '../professionals/schemas/professional.schema';
import { Clinic, ClinicDocument } from '../clinics/schemas/clinic.schema';
import { SearchQueryDto } from './dto/search-query.dto';
import { SearchResult } from './interfaces/search-result.interface';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

@Injectable()
export class SearchService {
  constructor(
    @InjectModel(Professional.name)
    private readonly professionalModel: Model<ProfessionalDocument>,
    @InjectModel(Clinic.name)
    private readonly clinicModel: Model<ClinicDocument>,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  async search(query: SearchQueryDto): Promise<SearchResult> {
    const { type, q, specialty, city } = query;

    const result: SearchResult = {
      professionals: [],
      clinics: [],
    };

    if (type !== 'clinic') {
      // RN20: only show professionals with active subscription
      const activeProfIds =
        await this.subscriptionsService.findActiveOwnerIds('professional');

      const professionalFilter: Record<string, unknown> = {
        _id: { $in: activeProfIds },
      };

      if (q) {
        professionalFilter.$or = [
          { name: { $regex: q, $options: 'i' } },
          { bio: { $regex: q, $options: 'i' } },
        ];
      }

      if (specialty) {
        professionalFilter.specialty = { $regex: specialty, $options: 'i' };
      }

      if (city) {
        professionalFilter.city = { $regex: city, $options: 'i' };
      }

      result.professionals = await this.professionalModel
        .find(professionalFilter)
        .lean()
        .exec();
    }

    if (type !== 'professional') {
      const clinicFilter: Record<string, unknown> = {};

      if (q) {
        clinicFilter.$or = [
          { name: { $regex: q, $options: 'i' } },
          { description: { $regex: q, $options: 'i' } },
        ];
      }

      if (city) {
        clinicFilter.city = { $regex: city, $options: 'i' };
      }

      result.clinics = await this.clinicModel.find(clinicFilter).lean().exec();
    }

    return result;
  }
}

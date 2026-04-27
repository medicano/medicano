import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Professional,
  ProfessionalDocument,
} from '../professionals/schemas/professional.schema';
import { Clinic, ClinicDocument } from '../clinics/schemas/clinic.schema';
import { SearchQueryDto } from './dto/search-query.dto';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

export interface SearchResult {
  id: string;
  name: string;
  type: 'professional' | 'clinic';
  specialty?: string;
  address?: string;
}

@Injectable()
export class SearchService {
  constructor(
    @InjectModel(Professional.name)
    private readonly professionalModel: Model<ProfessionalDocument>,
    @InjectModel(Clinic.name)
    private readonly clinicModel: Model<ClinicDocument>,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  async search(query: SearchQueryDto): Promise<SearchResult[]> {
    const { type, name, specialty, address } = query;

    const results: SearchResult[] = [];

    if (type === 'clinic' || type === undefined) {
      const clinicFilter: Record<string, unknown> = {};

      if (name) {
        clinicFilter.name = { $regex: name, $options: 'i' };
      }

      if (address) {
        clinicFilter.address = { $regex: address, $options: 'i' };
      }

      const clinics = await this.clinicModel.find(clinicFilter).lean().exec();

      for (const clinic of clinics) {
        results.push({
          id: (clinic._id as Types.ObjectId).toString(),
          name: clinic.name,
          type: 'clinic',
          address: clinic.address,
        });
      }
    }

    if (type === 'professional' || type === undefined) {
      const professionalFilter: Record<string, unknown> = {};

      if (name) {
        professionalFilter.name = { $regex: name, $options: 'i' };
      }

      if (specialty) {
        professionalFilter.specialty = { $regex: specialty, $options: 'i' };
      }

      if (address) {
        professionalFilter.address = { $regex: address, $options: 'i' };
      }

      // RN20: only show professionals with active subscription
      const activeProfIds =
        await this.subscriptionsService.findActiveOwnerIds('professional');
      professionalFilter._id = { $in: activeProfIds };

      const professionals = await this.professionalModel
        .find(professionalFilter)
        .lean()
        .exec();

      for (const professional of professionals) {
        results.push({
          id: (professional._id as Types.ObjectId).toString(),
          name: professional.name,
          type: 'professional',
          specialty: professional.specialty,
          address: professional.address,
        });
      }
    }

    return results;
  }
}

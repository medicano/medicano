import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { Professional, ProfessionalDocument } from '../professionals/schemas/professional.schema';
import { Specialty } from '../common/enums/specialty.enum';

export interface SearchQueryParams {
  city?: string;
  state?: string;
  specialty?: Specialty;
  name?: string;
}

export interface SearchResult {
  id: string;
  name: string;
  specialty: Specialty;
  city: string;
  state: string;
  phone?: string;
  description?: string;
  autoConfirm: boolean;
}

@Injectable()
export class SearchService {
  constructor(
    @InjectModel(Professional.name)
    private readonly professionalModel: Model<ProfessionalDocument>,
  ) {}

  async search(params: SearchQueryParams): Promise<SearchResult[]> {
    const filter: FilterQuery<ProfessionalDocument> = {};

    if (params.city) {
      filter['address.city'] = { $regex: new RegExp(params.city, 'i') };
    }

    if (params.state) {
      filter['address.state'] = { $regex: new RegExp(params.state, 'i') };
    }

    if (params.specialty) {
      filter['specialty'] = params.specialty;
    }

    if (params.name) {
      filter['name'] = { $regex: new RegExp(params.name, 'i') };
    }

    const professionals = await this.professionalModel.find(filter).exec();

    return professionals.map((p) => ({
      id: (p._id as any).toString(),
      name: p.name,
      specialty: p.specialty,
      city: p.address?.city ?? '',
      state: p.address?.state ?? '',
      phone: p.phone,
      description: p.description,
      autoConfirm: p.autoConfirm,
    }));
  }

  async findBySpecialtyAndCity(
    specialty: Specialty,
    city: string,
  ): Promise<ProfessionalDocument[]> {
    return this.professionalModel
      .find({
        specialty,
        'address.city': { $regex: new RegExp(city, 'i') },
      })
      .exec();
  }
}

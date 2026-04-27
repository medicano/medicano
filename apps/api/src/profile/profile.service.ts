import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Professional, ProfessionalDocument } from '../professionals/schemas/professional.schema';
import { UpdateProfessionalProfileDto } from './dto/update-professional-profile.dto';

@Injectable()
export class ProfileService {
  constructor(
    @InjectModel(Professional.name)
    private readonly professionalModel: Model<ProfessionalDocument>,
  ) {}

  async getProfessionalProfile(userId: string): Promise<ProfessionalDocument> {
    const professional = await this.professionalModel.findOne({ userId }).exec();
    if (!professional) {
      throw new NotFoundException(`Professional profile for user ${userId} not found`);
    }
    return professional;
  }

  async updateProfessionalProfile(
    userId: string,
    updateProfessionalProfileDto: UpdateProfessionalProfileDto,
  ): Promise<ProfessionalDocument> {
    const professional = await this.professionalModel
      .findOneAndUpdate(
        { userId },
        { $set: updateProfessionalProfileDto },
        { new: true, runValidators: true },
      )
      .exec();
    if (!professional) {
      throw new NotFoundException(`Professional profile for user ${userId} not found`);
    }
    return professional;
  }

  formatProfileSummary(professional: ProfessionalDocument): string {
    const addressCity = professional.address?.city ?? 'unknown city';
    const addressState = professional.address?.state ?? 'unknown state';
    return `${professional.name} — ${professional.specialty} — ${addressCity}, ${addressState}`;
  }
}

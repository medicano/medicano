import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Clinic, ClinicDocument } from '../clinics/schemas/clinic.schema';
import { Professional, ProfessionalDocument } from '../professionals/schemas/professional.schema';
import { UpdateClinicProfileDto } from './dto/update-clinic-profile.dto';
import { UpdateProfessionalProfileDto } from './dto/update-professional-profile.dto';

@Injectable()
export class ProfileService {
  constructor(
    @InjectModel(Clinic.name)
    private readonly clinicModel: Model<ClinicDocument>,
    @InjectModel(Professional.name)
    private readonly professionalModel: Model<ProfessionalDocument>,
  ) {}

  async getClinicProfile(userId: string): Promise<ClinicDocument | null> {
    return this.clinicModel
      .findOne({ userId: new Types.ObjectId(userId), isActive: true })
      .exec();
  }

  async getProfessionalProfile(userId: string): Promise<ProfessionalDocument | null> {
    return this.professionalModel
      .findOne({ userId: new Types.ObjectId(userId), isActive: true })
      .exec();
  }

  async updateClinicProfile(
    userId: string,
    updateDto: UpdateClinicProfileDto,
  ): Promise<ClinicDocument | null> {
    const clinic = await this.clinicModel
      .findOneAndUpdate(
        { userId: new Types.ObjectId(userId), isActive: true },
        { $set: updateDto },
        { new: true },
      )
      .exec();

    if (!clinic) {
      throw new NotFoundException('Clinic profile not found');
    }

    return clinic;
  }

  async updateProfessionalProfile(
    userId: string,
    updateDto: UpdateProfessionalProfileDto,
  ): Promise<ProfessionalDocument | null> {
    const professional = await this.professionalModel
      .findOneAndUpdate(
        { userId: new Types.ObjectId(userId), isActive: true },
        { $set: updateDto },
        { new: true },
      )
      .exec();

    if (!professional) {
      throw new NotFoundException('Professional profile not found');
    }

    return professional;
  }
}

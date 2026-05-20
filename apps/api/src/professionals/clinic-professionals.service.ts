import { Injectable, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  ClinicProfessional,
  ClinicProfessionalDocument,
} from './schemas/clinic-professional.schema';
import { ClinicsService } from '../clinics/clinics.service';
import { ProfessionalsService } from './professionals.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

@Injectable()
export class ClinicProfessionalsService {
  constructor(
    @InjectModel(ClinicProfessional.name)
    private readonly clinicProfessionalModel: Model<ClinicProfessionalDocument>,
    private readonly clinicsService: ClinicsService,
    private readonly professionalsService: ProfessionalsService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  async assignProfessionalToClinic(
    clinicId: string,
    professionalId: string,
  ): Promise<ClinicProfessionalDocument> {
    const clinic = await this.clinicsService.findById(clinicId);
    await this.professionalsService.findById(professionalId);

    const currentCount = await this.clinicProfessionalModel.countDocuments({
      clinicId: new Types.ObjectId(clinicId),
    });

    await this.subscriptionsService.enforceClinicProfessionalLimit(
      clinic.userId.toString(),
      currentCount,
    );

    const professional = await this.professionalsService.findById(professionalId);

    try {
      const clinicProfessional = new this.clinicProfessionalModel({
        clinicId: new Types.ObjectId(clinicId),
        professionalId: new Types.ObjectId(professionalId),
      });
      const saved = await clinicProfessional.save();
      await this.clinicsService.addSpecialty(clinicId, professional.specialty);
      return saved;
    } catch (error: any) {
      if (error?.code === 11000) {
        throw new ConflictException(
          'Professional is already assigned to this clinic',
        );
      }
      throw error;
    }
  }

  async getProfessionalsByClinic(
    clinicId: string,
  ): Promise<ClinicProfessionalDocument[]> {
    await this.clinicsService.findById(clinicId);
    return this.clinicProfessionalModel
      .find({ clinicId: new Types.ObjectId(clinicId) })
      .exec();
  }

  async removeProfessionalFromClinic(
    clinicId: string,
    professionalId: string,
  ): Promise<void> {
    await this.clinicsService.findById(clinicId);
    const professional = await this.professionalsService.findById(professionalId);
    await this.clinicProfessionalModel.deleteOne({
      clinicId: new Types.ObjectId(clinicId),
      professionalId: new Types.ObjectId(professionalId),
    });
    await this.clinicsService.removeSpecialtyIfUnused(clinicId, professional.specialty);
  }
}

import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { ClinicsService } from '../clinics/clinics.service';
import { ProfessionalsService } from './professionals.service';
import {
  ClinicProfessional,
  ClinicProfessionalDocument,
} from './schemas/clinic-professional.schema';

@Injectable()
export class ClinicProfessionalsService {
  constructor(
    @InjectModel(ClinicProfessional.name)
    private readonly clinicProfessionalModel: Model<ClinicProfessionalDocument>,
    private readonly clinicsService: ClinicsService,
    private readonly professionalsService: ProfessionalsService,
  ) {}

  async assignProfessionalToClinic(
    clinicId: string,
    professionalId: string,
  ): Promise<ClinicProfessionalDocument> {
    if (!Types.ObjectId.isValid(clinicId)) {
      throw new NotFoundException(`Clinic with id ${clinicId} not found`);
    }
    if (!Types.ObjectId.isValid(professionalId)) {
      throw new NotFoundException(
        `Professional with id ${professionalId} not found`,
      );
    }

    await this.clinicsService.findById(clinicId);
    await this.professionalsService.findById(professionalId);

    try {
      const assignment = new this.clinicProfessionalModel({
        clinicId,
        professionalId,
      });
      return await assignment.save();
    } catch (error: unknown) {
      const err = error as { code?: number };
      if (err?.code === 11000) {
        throw new ConflictException(
          'Professional is already assigned to this clinic',
        );
      }
      throw error;
    }
  }

  async getProfessionalsByClinic(
    clinicId: string,
  ): Promise<unknown[]> {
    if (!Types.ObjectId.isValid(clinicId)) {
      throw new NotFoundException(`Clinic with id ${clinicId} not found`);
    }

    await this.clinicsService.findById(clinicId);

    const assignments = await this.clinicProfessionalModel
      .find({ clinicId })
      .populate('professionalId')
      .exec();

    return assignments.map(
      (assignment) => (assignment as unknown as { professionalId: unknown }).professionalId,
    );
  }

  async removeProfessionalFromClinic(
    clinicId: string,
    professionalId: string,
  ): Promise<ClinicProfessionalDocument> {
    if (!Types.ObjectId.isValid(clinicId)) {
      throw new NotFoundException(`Clinic with id ${clinicId} not found`);
    }
    if (!Types.ObjectId.isValid(professionalId)) {
      throw new NotFoundException(
        `Professional with id ${professionalId} not found`,
      );
    }

    const assignment = await this.clinicProfessionalModel
      .findOneAndDelete({ clinicId, professionalId })
      .exec();

    if (!assignment) {
      throw new NotFoundException('Professional assignment not found');
    }

    return assignment;
  }
}

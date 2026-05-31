import { Injectable, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  ClinicProfessional,
  ClinicProfessionalDocument,
} from './schemas/clinic-professional.schema';
import { Professional, ProfessionalDocument } from './schemas/professional.schema';
import { ClinicsService } from '../clinics/clinics.service';
import { ProfessionalsService } from './professionals.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { AppointmentsService } from '../appointments/appointments.service';

@Injectable()
export class ClinicProfessionalsService {
  constructor(
    @InjectModel(ClinicProfessional.name)
    private readonly clinicProfessionalModel: Model<ClinicProfessionalDocument>,
    @InjectModel(Professional.name)
    private readonly professionalModel: Model<ProfessionalDocument>,
    private readonly clinicsService: ClinicsService,
    private readonly professionalsService: ProfessionalsService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly appointmentsService: AppointmentsService,
  ) {}

  async assignProfessionalToClinic(
    clinicId: string,
    professionalId: string,
  ): Promise<ClinicProfessionalDocument> {
    await this.clinicsService.findById(clinicId);
    await this.professionalsService.findById(professionalId);

    const existingLinks = await this.clinicProfessionalModel
      .find({ clinicId: new Types.ObjectId(clinicId) })
      .select('professionalId')
      .lean()
      .exec();

    const linkedIds = existingLinks.map((l) => l.professionalId);
    const currentCount =
      linkedIds.length > 0
        ? await this.professionalModel.countDocuments({ _id: { $in: linkedIds } })
        : 0;

    await this.subscriptionsService.enforceClinicProfessionalLimit(
      clinicId,
      currentCount,
    );

    const professional = await this.professionalsService.findById(professionalId);

    try {
      const clinicProfessional = new this.clinicProfessionalModel({
        clinicId: new Types.ObjectId(clinicId),
        professionalId: new Types.ObjectId(professionalId),
      });
      const saved = await clinicProfessional.save();
      if (professional.specialty) {
        await this.clinicsService.addSpecialty(clinicId, professional.specialty);
      }
      return saved;
    } catch (error: any) {
      if (error?.code === 11000) {
        throw new ConflictException(
          'Profissional já vinculado a este estabelecimento',
        );
      }
      throw error;
    }
  }

  async getProfessionalsByClinic(clinicId: string): Promise<any[]> {
    await this.clinicsService.findById(clinicId);

    const links = await this.clinicProfessionalModel
      .find({ clinicId: new Types.ObjectId(clinicId) })
      .lean()
      .exec();

    if (links.length === 0) return [];

    const professionalIds = links.map((l) => l.professionalId);

    const professionals = await this.professionalModel
      .find({ _id: { $in: professionalIds } })
      .lean()
      .exec();

    return professionals.map((p) => ({
      ...p,
      _id: (p._id as Types.ObjectId).toString(),
    }));
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
    await this.appointmentsService.cancelActiveByProfessionalAndClinic(professionalId, clinicId);
    if (professional.specialty) {
      await this.clinicsService.removeSpecialtyIfUnused(clinicId, professional.specialty);
    }
  }
}

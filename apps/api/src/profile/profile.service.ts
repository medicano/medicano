import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Clinic, ClinicDocument } from '../clinics/schemas/clinic.schema';
import { Professional, ProfessionalDocument } from '../professionals/schemas/professional.schema';
import { Patient, PatientDocument } from '../patients/schemas/patient.schema';
import { UpdateClinicProfileDto } from './dto/update-clinic-profile.dto';
import { UpdateProfessionalProfileDto } from './dto/update-professional-profile.dto';
import { UpdatePatientProfileDto } from '../patients/dto/update-patient-profile.dto';

@Injectable()
export class ProfileService {
  constructor(
    @InjectModel(Clinic.name)
    private readonly clinicModel: Model<ClinicDocument>,
    @InjectModel(Professional.name)
    private readonly professionalModel: Model<ProfessionalDocument>,
    @InjectModel(Patient.name)
    private readonly patientModel: Model<PatientDocument>,
  ) {}

  async getMyProfile(
    userId: string,
  ): Promise<ClinicDocument | ProfessionalDocument | PatientDocument | null> {
    const clinic = await this.clinicModel
      .findOne({ userId: new Types.ObjectId(userId), isActive: true })
      .exec();
    if (clinic) return clinic;

    const professional = await this.professionalModel
      .findOne({ userId: new Types.ObjectId(userId), isActive: true })
      .exec();
    if (professional) return professional;

    return this.patientModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .exec();
  }

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

  async updatePatientProfile(
    userId: string,
    updateDto: UpdatePatientProfileDto,
  ): Promise<PatientDocument> {
    const patient = await this.patientModel
      .findOneAndUpdate(
        { userId: new Types.ObjectId(userId) },
        { $set: updateDto },
        { new: true, upsert: true },
      )
      .exec();

    return patient;
  }

  async updateClinicProfile(
    userId: string,
    updateDto: UpdateClinicProfileDto,
  ): Promise<ClinicDocument> {
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
  ): Promise<ProfessionalDocument> {
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

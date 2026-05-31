import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Clinic, ClinicDocument } from '../clinics/schemas/clinic.schema';
import { Professional, ProfessionalDocument } from '../professionals/schemas/professional.schema';
import { Patient, PatientDocument } from '../patients/schemas/patient.schema';
import { UserDocument } from '../auth/schemas/user.schema';
import { Role } from '../common/enums/role.enum';
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
    @InjectModel('User')
    private readonly userModel: Model<UserDocument>,
  ) {}

  async getMyProfile(
    userId: string,
  ): Promise<ClinicDocument | ProfessionalDocument | PatientDocument | null> {
    const clinic = await this.clinicModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .exec();
    if (clinic) return clinic;

    const professional = await this.professionalModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .exec();
    if (professional) return professional;

    return this.patientModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .exec();
  }

  async getClinicProfile(userId: string): Promise<ClinicDocument | null> {
    return this.clinicModel
      .findOne({ userId: new Types.ObjectId(userId), isActive: { $ne: false } })
      .exec();
  }

  async getProfessionalProfile(userId: string): Promise<ProfessionalDocument | null> {
    return this.professionalModel
      .findOne({ userId: new Types.ObjectId(userId), isActive: { $ne: false } })
      .exec();
  }

  async getPatientProfile(userId: string): Promise<PatientDocument | null> {
    return this.patientModel
      .findOne({ userId: new Types.ObjectId(userId) })
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
    const geoUpdate: { lat?: number; lng?: number } = {};
    if (updateDto.addressText) {
      const coords = await this.geocodeAddress(updateDto.addressText);
      if (coords) {
        geoUpdate.lat = coords.lat;
        geoUpdate.lng = coords.lng;
      }
    }

    // upsert: clinic-role users whose Clinic document was never created
    // (e.g. signup created the user but clinic creation failed) get one here.
    const clinic = await this.clinicModel
      .findOneAndUpdate(
        { userId: new Types.ObjectId(userId) },
        { $set: { ...updateDto, ...geoUpdate } },
        { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true },
      )
      .exec();

    return clinic;
  }

  private async geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
    // Nominatim é um serviço externo: limitamos o tempo de espera para que uma
    // resposta lenta não bloqueie o salvamento do perfil da clínica.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&countrycodes=br`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Medicano/1.0 (contato@medicano.app)' },
        signal: controller.signal,
      });
      const data = await res.json() as any[];
      if (!data[0]) return null;
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  async updateProfessionalProfile(
    userId: string,
    updateDto: UpdateProfessionalProfileDto,
  ): Promise<ProfessionalDocument> {
    const professional = await this.professionalModel
      .findOneAndUpdate(
        { userId: new Types.ObjectId(userId), isActive: true },
        { $set: updateDto },
        { new: true, runValidators: true },
      )
      .exec();

    if (!professional) {
      throw new NotFoundException('Perfil do profissional não encontrado');
    }

    return professional;
  }

  async deleteAccount(userId: string, role: Role): Promise<void> {
    if (role === Role.CLINIC) {
      await this.clinicModel
        .findOneAndUpdate({ userId: new Types.ObjectId(userId) }, { $set: { isActive: false } })
        .exec();
    } else if (role === Role.PROFESSIONAL) {
      await this.professionalModel
        .findOneAndUpdate({ userId: new Types.ObjectId(userId) }, { $set: { isActive: false } })
        .exec();
    }

    await this.userModel
      .findByIdAndUpdate(userId, { $set: { isActive: false } })
      .exec();
  }
}

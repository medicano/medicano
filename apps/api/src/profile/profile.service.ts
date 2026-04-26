import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Role } from '../common/enums/role.enum';
import { UserDocument } from '../auth/schemas/user.schema';
import { Patient, PatientDocument } from '../patients/schemas/patient.schema';
import { ClinicDocument } from '../clinics/schemas/clinic.schema';
import { ProfessionalDocument } from '../professionals/schemas/professional.schema';
import { ClinicsService } from '../clinics/clinics.service';
import { ProfessionalsService } from '../professionals/professionals.service';
import { UpdatePatientProfileDto } from '../patients/dto/update-patient-profile.dto';
import { UpdateClinicProfileDto } from './dto/update-clinic-profile.dto';
import { UpdateProfessionalProfileDto } from './dto/update-professional-profile.dto';

@Injectable()
export class ProfileService {
  constructor(
    @InjectModel('User')
    private readonly userModel: Model<UserDocument>,
    @InjectModel(Patient.name)
    private readonly patientModel: Model<PatientDocument>,
    private readonly clinicsService: ClinicsService,
    private readonly professionalsService: ProfessionalsService,
  ) {}

  async getMyProfile(
    userId: string,
  ): Promise<{ user: any; profile: any }> {
    const user = await this.userModel
      .findById(userId)
      .select('-passwordHash')
      .lean()
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    let profile:
      | PatientDocument
      | ClinicDocument
      | ProfessionalDocument
      | null = null;

    switch (user.role) {
      case Role.PATIENT:
        profile = await this.patientModel.findOne({ userId }).exec();
        break;
      case Role.CLINIC:
        try {
          profile = await this.clinicsService.findByUserId(userId);
        } catch (err) {
          if (err instanceof NotFoundException) {
            profile = null;
          } else {
            throw err;
          }
        }
        break;
      case Role.PROFESSIONAL:
        try {
          profile = await this.professionalsService.findByUserId(userId);
        } catch (err) {
          if (err instanceof NotFoundException) {
            profile = null;
          } else {
            throw err;
          }
        }
        break;
      default:
        profile = null;
        break;
    }

    return { user, profile };
  }

  async updatePatientProfile(
    userId: string,
    dto: UpdatePatientProfileDto,
  ): Promise<PatientDocument> {
    const updated = await this.patientModel
      .findOneAndUpdate(
        { userId },
        {
          $set: dto,
          $setOnInsert: { userId },
        },
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true,
        },
      )
      .exec();

    return updated as PatientDocument;
  }

  async updateClinicProfile(
    userId: string,
    dto: UpdateClinicProfileDto,
  ): Promise<ClinicDocument> {
    const clinic = await this.clinicsService.findByUserId(userId);
    return this.clinicsService.update(clinic._id.toString(), dto);
  }

  async updateProfessionalProfile(
    userId: string,
    dto: UpdateProfessionalProfileDto,
  ): Promise<ProfessionalDocument> {
    const professional =
      await this.professionalsService.findByUserId(userId);
    return this.professionalsService.update(
      professional._id.toString(),
      dto,
    );
  }
}

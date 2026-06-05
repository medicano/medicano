import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
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
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { GeocodingService } from '../common/geocoding/geocoding.service';
import { composeAddressText } from '../common/utils/address-form.util';

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
    private readonly subscriptionsService: SubscriptionsService,
    private readonly geocodingService: GeocodingService,
  ) {}

  async getMyProfile(
    userId: string,
  ): Promise<Record<string, unknown> | null> {
    const userObjectId = new Types.ObjectId(userId);
    const profile =
      (await this.clinicModel.findOne({ userId: userObjectId }).exec()) ??
      (await this.professionalModel.findOne({ userId: userObjectId }).exec()) ??
      (await this.patientModel.findOne({ userId: userObjectId }).exec());

    if (!profile) return null;

    // O documento de perfil não guarda o papel (role vive no User). O front usa
    // este endpoint para reidratar a sessão no F5; sem role + id aqui, o
    // roteamento por papel quebra (paciente acabava caindo em /dashboard).
    const user = await this.userModel
      .findById(userId)
      .select('role')
      .lean()
      .exec();

    return {
      ...profile.toObject(),
      id: (profile._id as Types.ObjectId).toString(),
      role: (user as { role?: string } | null)?.role,
    };
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
    // Mantém cep/city/state (campos de contexto) em sincronia com o addressForm.
    const derived: Record<string, unknown> = {};
    if (updateDto.addressForm) {
      if (updateDto.addressForm.cep) derived.cep = updateDto.addressForm.cep;
      if (updateDto.addressForm.city) derived.city = updateDto.addressForm.city;
      if (updateDto.addressForm.state) derived.state = updateDto.addressForm.state;
    }

    const patient = await this.patientModel
      .findOneAndUpdate(
        { userId: new Types.ObjectId(userId) },
        { $set: { ...updateDto, ...derived } },
        { new: true, upsert: true },
      )
      .exec();

    return patient;
  }

  async updateClinicProfile(
    userId: string,
    updateDto: UpdateClinicProfileDto,
  ): Promise<ClinicDocument> {
    // addressForm (estruturado) é a fonte: deriva addressText/city/reference e,
    // a partir do texto, geocodifica lat/lng. Sem addressForm, usa o addressText
    // avulso (compatibilidade).
    const derived: Record<string, unknown> = {};
    const addressText = updateDto.addressForm
      ? composeAddressText(updateDto.addressForm)
      : updateDto.addressText;
    if (updateDto.addressForm) {
      derived.addressText = addressText;
      if (updateDto.addressForm.city) derived.city = updateDto.addressForm.city;
      derived.addressReference = updateDto.addressForm.reference;
    }
    const coords = updateDto.addressForm
      ? await this.geocodingService.geocodeAddressForm(updateDto.addressForm)
      : addressText
        ? await this.geocodingService.geocodeAddress(addressText)
        : null;
    if (coords) {
      derived.lat = coords.lat;
      derived.lng = coords.lng;
    }

    // upsert: clinic-role users whose Clinic document was never created
    // (e.g. signup created the user but clinic creation failed) get one here.
    const clinic = await this.clinicModel
      .findOneAndUpdate(
        { userId: new Types.ObjectId(userId) },
        { $set: { ...updateDto, ...derived } },
        { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true },
      )
      .exec();

    // Keep User in sync: displayName feeds name-based displays (sidebar) and
    // email is the login identity. The profile is the editable source of truth,
    // so changes here must propagate back to the User document.
    await this.syncUserContact(userId, {
      displayName: updateDto.name,
      email: updateDto.email,
    });

    // A clinic created here (self-heal upsert) must also get a subscription,
    // otherwise it and its professionals stay hidden from patient search.
    await this.subscriptionsService.ensureForClinic(
      (clinic._id as Types.ObjectId).toString(),
    );

    return clinic;
  }

  async updateProfessionalProfile(
    userId: string,
    updateDto: UpdateProfessionalProfileDto,
  ): Promise<ProfessionalDocument> {
    // Geocodifica o endereço para a busca por proximidade (profissional autônomo
    // usa as próprias coordenadas).
    const derived: Record<string, unknown> = {};
    if (updateDto.addressForm) {
      const coords = await this.geocodingService.geocodeAddressForm(updateDto.addressForm);
      if (coords) {
        derived.lat = coords.lat;
        derived.lng = coords.lng;
      }
    }

    const professional = await this.professionalModel
      .findOneAndUpdate(
        { userId: new Types.ObjectId(userId), isActive: true },
        { $set: { ...updateDto, ...derived } },
        { new: true, runValidators: true },
      )
      .exec();

    if (!professional) {
      throw new NotFoundException('Perfil do profissional não encontrado');
    }

    // The professional profile is the editable source of truth; keep the User
    // document (login email + name-based displays) in sync with it.
    await this.syncUserContact(userId, {
      displayName: updateDto.name,
      email: updateDto.email,
    });

    return professional;
  }

  // Propagates profile-editable contact fields back to the User document, which
  // owns the login identity. The email index is unique, so a collision with
  // another user surfaces as a ConflictException instead of a raw Mongo error.
  private async syncUserContact(
    userId: string,
    contact: { displayName?: string; email?: string },
  ): Promise<void> {
    const update: { displayName?: string; email?: string } = {};
    if (contact.displayName) update.displayName = contact.displayName;
    if (contact.email) update.email = contact.email;

    if (Object.keys(update).length === 0) return;

    try {
      await this.userModel
        .updateOne({ _id: new Types.ObjectId(userId) }, { $set: update })
        .exec();
    } catch (error) {
      if ((error as { code?: number }).code === 11000) {
        throw new ConflictException('E-mail já está em uso por outra conta');
      }
      throw error;
    }
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

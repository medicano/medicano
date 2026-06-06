import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { NotificationsService } from '../notifications/notifications.service';
import {
  Appointment,
  AppointmentDocument,
  AppointmentStatus,
} from './schemas/appointment.schema';
import { Professional, ProfessionalDocument } from '../professionals/schemas/professional.schema';
import { Clinic, ClinicDocument } from '../clinics/schemas/clinic.schema';
import { User, UserDocument } from '../auth/schemas/user.schema';
import { Role } from '../common/enums/role.enum';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { GetAppointmentsQueryDto } from './dto/get-appointments-query.dto';

type CancelledBy = 'patient' | 'provider';

interface AuthenticatedUser {
  userId: string;
  role: Role;
}

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectModel(Appointment.name)
    private readonly appointmentModel: Model<AppointmentDocument>,
    @InjectModel(Professional.name)
    private readonly professionalModel: Model<ProfessionalDocument>,
    @InjectModel(Clinic.name)
    private readonly clinicModel: Model<ClinicDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async createAppointment(dto: CreateAppointmentDto): Promise<AppointmentDocument> {
    const durationMinutes = dto.durationMinutes ?? 30;
    const startAt = new Date(dto.startAt);
    const endAt = new Date(startAt.getTime() + durationMinutes * 60 * 1000);

    const status = (await this.shouldAutoConfirm(dto))
      ? AppointmentStatus.CONFIRMED
      : AppointmentStatus.SCHEDULED;

    const appointment = await this.appointmentModel.create({
      ...dto,
      durationMinutes,
      endAt,
      status,
    });

    this.notificationsService.notifyAppointmentCreated(appointment).catch(() => {});
    if (status === AppointmentStatus.CONFIRMED) {
      this.notificationsService.notifyAppointmentConfirmed(appointment).catch(() => {});
    }

    return appointment;
  }

  // Confirmação automática segue a hierarquia de privilégio: dentro de uma
  // clínica, vale o autoConfirm da clínica (funcionários seguem a decisão dela);
  // profissional autônomo (sem clinicId) decide pelo próprio autoConfirm.
  private async shouldAutoConfirm(dto: CreateAppointmentDto): Promise<boolean> {
    if (dto.clinicId) {
      const clinic = await this.clinicModel
        .findById(dto.clinicId)
        .select('autoConfirm')
        .lean()
        .exec();
      return clinic?.autoConfirm ?? false;
    }

    if (dto.professionalId) {
      const professional = await this.professionalModel
        .findById(dto.professionalId)
        .select('autoConfirm')
        .lean()
        .exec();
      return professional?.autoConfirm ?? false;
    }

    return false;
  }

  async findAll(query: GetAppointmentsQueryDto | undefined, user: AuthenticatedUser): Promise<any[]> {
    const filter: Record<string, unknown> = {};
    if (query?.clinicId) filter['clinicId'] = query.clinicId;
    if (query?.professionalId) filter['professionalId'] = query.professionalId;
    if (query?.patientId) filter['patientId'] = query.patientId;
    if (query?.status) filter['status'] = query.status;
    if (query?.upcoming === 'true' || query?.upcoming === true) {
      const todayMidnight = new Date();
      todayMidnight.setHours(0, 0, 0, 0);
      filter['startAt'] = { $gte: todayMidnight };
      if (!query?.status) filter['status'] = { $in: ['scheduled', 'confirmed'] };
    }

    // Escopo de acesso obrigatório: sobrescreve qualquer filtro de identidade da
    // query para que cada papel só enxergue os agendamentos que lhe pertencem.
    Object.assign(filter, await this.resolveAccessScope(user));

    const appointments = await this.appointmentModel.find(filter).sort({ startAt: 1 }).lean().exec();
    if (appointments.length === 0) return [];

    const professionalIds = [...new Set(appointments.map((a) => a.professionalId?.toString()).filter(Boolean))];
    const clinicIds = [...new Set(appointments.map((a) => a.clinicId?.toString()).filter(Boolean))];
    const patientIds = [...new Set(appointments.map((a) => a.patientId?.toString()).filter(Boolean))];

    const [professionals, clinics, patients] = await Promise.all([
      this.professionalModel.find({ _id: { $in: professionalIds } }).select('name specialty').lean().exec(),
      this.clinicModel.find({ _id: { $in: clinicIds } }).select('name').lean().exec(),
      this.userModel.find({ _id: { $in: patientIds } }).select('displayName email').lean().exec(),
    ]);

    const proMap = new Map(professionals.map((p) => [(p._id as any).toString(), p]));
    const clinicMap = new Map(clinics.map((c) => [(c._id as any).toString(), c]));
    const patientMap = new Map(patients.map((p) => [(p._id as any).toString(), p]));

    return appointments.map((a) => {
      const pro = proMap.get(a.professionalId?.toString() ?? '');
      const clinic = clinicMap.get(a.clinicId?.toString() ?? '');
      const patient = patientMap.get(a.patientId?.toString() ?? '');
      return {
        ...a,
        id: (a._id as any).toString(),
        patientName: (patient as any)?.displayName ?? (patient as any)?.email ?? '',
        professionalName: pro?.name ?? '',
        specialty: pro?.specialty ?? '',
        clinicName: clinic?.name ?? '',
      };
    });
  }

  // Resolve o filtro de identidade que delimita o que cada papel pode listar.
  // Um usuário clinic/professional é dono de um documento Clinic/Professional
  // (vinculado por userId), e o agendamento referencia o _id desses documentos,
  // não o userId. Atendentes herdam o clinicId gravado no próprio usuário.
  private async resolveAccessScope(
    user: AuthenticatedUser,
  ): Promise<Record<string, unknown>> {
    switch (user.role) {
      case Role.PATIENT:
        return { patientId: user.userId };
      case Role.CLINIC: {
        const clinic = await this.clinicModel
          .findOne({ userId: user.userId })
          .select('_id')
          .lean()
          .exec();
        return { clinicId: clinic?._id ?? null };
      }
      case Role.PROFESSIONAL: {
        const professional = await this.professionalModel
          .findOne({ userId: user.userId })
          .select('_id')
          .lean()
          .exec();
        return { professionalId: professional?._id ?? null };
      }
      case Role.ATTENDANT: {
        // Atendente de clínica enxerga os agendamentos da clínica; atendente de
        // profissional autônomo enxerga os do profissional.
        const attendant = await this.userModel
          .findById(user.userId)
          .select('clinicId professionalId')
          .lean()
          .exec();
        if (attendant?.professionalId) {
          return { professionalId: attendant.professionalId };
        }
        return { clinicId: attendant?.clinicId ?? null };
      }
      default:
        // Nenhum papel conhecido: filtro impossível, nunca retorna agendamentos.
        return { _id: null };
    }
  }

  async getAppointmentById(id: string): Promise<any> {
    const appointment = await this.appointmentModel.findById(id).lean().exec();
    if (!appointment) {
      throw new NotFoundException(`Agendamento não encontrado`);
    }

    const [professional, clinic, patient] = await Promise.all([
      appointment.professionalId
        ? this.professionalModel.findById(appointment.professionalId).select('name specialty').lean().exec()
        : null,
      appointment.clinicId
        ? this.clinicModel.findById(appointment.clinicId).select('name').lean().exec()
        : null,
      appointment.patientId
        ? this.userModel.findById(appointment.patientId).select('displayName email').lean().exec()
        : null,
    ]);

    return {
      ...appointment,
      id: (appointment._id as any).toString(),
      patientName: (patient as any)?.displayName ?? (patient as any)?.email ?? '',
      professionalName: (professional as any)?.name ?? '',
      specialty: (professional as any)?.specialty ?? '',
      clinicName: (clinic as any)?.name ?? '',
    };
  }

  async findById(id: string): Promise<any> {
    return this.getAppointmentById(id);
  }

  async getAppointmentsByClinic(clinicId: string): Promise<AppointmentDocument[]> {
    return this.appointmentModel.find({ clinicId }).exec();
  }

  async getAppointmentsByProfessional(professionalId: string): Promise<AppointmentDocument[]> {
    return this.appointmentModel.find({ professionalId }).exec();
  }

  async update(id: string, dto: UpdateAppointmentDto): Promise<AppointmentDocument> {
    const updated = await this.appointmentModel
      .findByIdAndUpdate(id, { $set: dto }, { new: true, runValidators: true })
      .exec();
    if (!updated) {
      throw new NotFoundException(`Agendamento não encontrado`);
    }
    return updated;
  }

  async updateStatus(id: string, status: AppointmentStatus): Promise<AppointmentDocument> {
    const updated = await this.appointmentModel
      .findByIdAndUpdate(id, { $set: { status } }, { new: true })
      .exec();
    if (!updated) {
      throw new NotFoundException(`Agendamento não encontrado`);
    }

    if (status === AppointmentStatus.CONFIRMED) {
      this.notificationsService.notifyAppointmentConfirmed(updated).catch(() => {});
    } else if (status === AppointmentStatus.CANCELLED) {
      this.notificationsService.notifyAppointmentCancelled(updated).catch(() => {});
    }

    return updated;
  }

  async cancelActiveByProfessionalAndClinic(
    professionalId: string,
    clinicId: string,
  ): Promise<void> {
    const activeStatuses = [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED];

    const activeAppointments = await this.appointmentModel
      .find({ professionalId, clinicId, status: { $in: activeStatuses } })
      .exec();

    if (activeAppointments.length === 0) return;

    await this.appointmentModel.updateMany(
      { professionalId, clinicId, status: { $in: activeStatuses } },
      { $set: { status: AppointmentStatus.CANCELLED } },
    );

    for (const appointment of activeAppointments) {
      this.notificationsService.notifyAppointmentCancelled(appointment, 'provider').catch(() => {});
    }
  }

  async cancelAppointment(
    id: string,
    userId: string,
    cancelledBy: CancelledBy,
  ): Promise<AppointmentDocument> {
    const appointment = await this.appointmentModel.findById(id).exec();
    if (!appointment) {
      throw new NotFoundException(`Agendamento não encontrado`);
    }

    if (cancelledBy === 'patient' && appointment.patientId.toString() !== userId) {
      throw new ForbiddenException('Você não tem permissão para cancelar este agendamento');
    }

    const cancelled = await this.appointmentModel
      .findByIdAndUpdate(id, { $set: { status: AppointmentStatus.CANCELLED } }, { new: true })
      .exec();

    this.notificationsService.notifyAppointmentCancelled(cancelled!, cancelledBy).catch(() => {});

    return cancelled!;
  }
}

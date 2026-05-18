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
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { GetAppointmentsQueryDto } from './dto/get-appointments-query.dto';

type CancelledBy = 'patient' | 'provider';

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectModel(Appointment.name)
    private readonly appointmentModel: Model<AppointmentDocument>,
    @InjectModel(Professional.name)
    private readonly professionalModel: Model<ProfessionalDocument>,
    @InjectModel(Clinic.name)
    private readonly clinicModel: Model<ClinicDocument>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async createAppointment(dto: CreateAppointmentDto): Promise<AppointmentDocument> {
    const durationMinutes = dto.durationMinutes ?? 30;
    const startAt = new Date(dto.startAt);
    const endAt = new Date(startAt.getTime() + durationMinutes * 60 * 1000);
    const appointment = await this.appointmentModel.create({ ...dto, durationMinutes, endAt });
    this.notificationsService.notifyAppointmentCreated(appointment).catch(() => {});
    return appointment;
  }

  async findAll(query?: GetAppointmentsQueryDto): Promise<any[]> {
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

    const appointments = await this.appointmentModel.find(filter).sort({ startAt: 1 }).lean().exec();
    if (appointments.length === 0) return [];

    const professionalIds = [...new Set(appointments.map((a) => a.professionalId?.toString()).filter(Boolean))];
    const clinicIds = [...new Set(appointments.map((a) => a.clinicId?.toString()).filter(Boolean))];

    const [professionals, clinics] = await Promise.all([
      this.professionalModel.find({ _id: { $in: professionalIds } }).select('name specialty').lean().exec(),
      this.clinicModel.find({ _id: { $in: clinicIds } }).select('name').lean().exec(),
    ]);

    const proMap = new Map(professionals.map((p) => [(p._id as any).toString(), p]));
    const clinicMap = new Map(clinics.map((c) => [(c._id as any).toString(), c]));

    return appointments.map((a) => {
      const pro = proMap.get(a.professionalId?.toString() ?? '');
      const clinic = clinicMap.get(a.clinicId?.toString() ?? '');
      return {
        ...a,
        id: (a._id as any).toString(),
        professionalName: pro?.name ?? '',
        specialty: pro?.specialty ?? '',
        clinicName: clinic?.name ?? '',
      };
    });
  }

  async getAppointmentById(id: string): Promise<AppointmentDocument> {
    const appointment = await this.appointmentModel.findById(id).exec();
    if (!appointment) {
      throw new NotFoundException(`Appointment ${id} not found`);
    }
    return appointment;
  }

  async findById(id: string): Promise<AppointmentDocument> {
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
      throw new NotFoundException(`Appointment ${id} not found`);
    }
    return updated;
  }

  async updateStatus(id: string, status: AppointmentStatus): Promise<AppointmentDocument> {
    const updated = await this.appointmentModel
      .findByIdAndUpdate(id, { $set: { status } }, { new: true })
      .exec();
    if (!updated) {
      throw new NotFoundException(`Appointment ${id} not found`);
    }

    if (status === AppointmentStatus.CONFIRMED) {
      this.notificationsService.notifyAppointmentConfirmed(updated).catch(() => {});
    } else if (status === AppointmentStatus.CANCELLED) {
      this.notificationsService.notifyAppointmentCancelled(updated).catch(() => {});
    }

    return updated;
  }

  async cancelAppointment(
    id: string,
    userId: string,
    cancelledBy: CancelledBy,
  ): Promise<AppointmentDocument> {
    const appointment = await this.appointmentModel.findById(id).exec();
    if (!appointment) {
      throw new NotFoundException(`Appointment ${id} not found`);
    }

    if (cancelledBy === 'patient' && appointment.patientId.toString() !== userId) {
      throw new ForbiddenException('You are not authorized to cancel this appointment');
    }

    const cancelled = await this.appointmentModel
      .findByIdAndUpdate(id, { $set: { status: AppointmentStatus.CANCELLED } }, { new: true })
      .exec();

    this.notificationsService.notifyAppointmentCancelled(cancelled!, cancelledBy).catch(() => {});

    return cancelled!;
  }
}

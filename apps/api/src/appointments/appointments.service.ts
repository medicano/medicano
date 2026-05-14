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
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { GetAppointmentsQueryDto } from './dto/get-appointments-query.dto';

type CancelledBy = 'patient' | 'provider';

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectModel(Appointment.name)
    private readonly appointmentModel: Model<AppointmentDocument>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async createAppointment(dto: CreateAppointmentDto): Promise<AppointmentDocument> {
    const appointment = await this.appointmentModel.create(dto);
    this.notificationsService.notifyAppointmentCreated(appointment).catch(() => {});
    return appointment;
  }

  async findAll(query?: GetAppointmentsQueryDto): Promise<AppointmentDocument[]> {
    const filter: Record<string, unknown> = {};
    if (query?.clinicId) filter['clinicId'] = query.clinicId;
    if (query?.professionalId) filter['professionalId'] = query.professionalId;
    if (query?.patientId) filter['patientId'] = query.patientId;
    if (query?.status) filter['status'] = query.status;
    return this.appointmentModel.find(filter).exec();
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

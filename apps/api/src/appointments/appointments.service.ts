import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { NotificationsService } from '../notifications/notifications.service';
import { AvailabilityService } from '../availability/availability.service';
import { Appointment, AppointmentDocument, AppointmentStatus } from './schemas/appointment.schema';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentStatusDto } from './dto/update-appointment-status.dto';

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectModel(Appointment.name) private readonly appointmentModel: Model<AppointmentDocument>,
    private readonly availabilityService: AvailabilityService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(dto: CreateAppointmentDto): Promise<AppointmentDocument> {
    await this.availabilityService.validateSlot(dto.providerId, dto.scheduledAt);

    const appointment = new this.appointmentModel(dto);
    const saved = await appointment.save();

    void this.notificationsService.notifyAppointmentCreated(saved);

    return saved;
  }

  async createAppointment(dto: CreateAppointmentDto): Promise<AppointmentDocument> {
    const appointment = await this.appointmentModel.create(dto);

    void this.notificationsService.notifyAppointmentCreated(appointment);

    return appointment;
  }

  async findAll(): Promise<AppointmentDocument[]> {
    return this.appointmentModel.find().exec();
  }

  async findOne(id: string): Promise<AppointmentDocument> {
    const appointment = await this.appointmentModel.findById(id).exec();

    if (!appointment) {
      throw new NotFoundException(`Appointment ${id} not found`);
    }

    return appointment;
  }

  async updateStatus(id: string, dto: UpdateAppointmentStatusDto): Promise<AppointmentDocument> {
    const appointment = await this.findOne(id);

    appointment.status = dto.status;

    const saved = await appointment.save();

    if (dto.status === AppointmentStatus.CONFIRMED) {
      void this.notificationsService.notifyAppointmentConfirmed(saved);
    } else if (dto.status === AppointmentStatus.CANCELLED) {
      void this.notificationsService.notifyAppointmentCancelled(saved, 'provider');
    }

    return saved;
  }

  async cancel(id: string): Promise<AppointmentDocument> {
    const appointment = await this.findOne(id);

    if (appointment.status === AppointmentStatus.CANCELLED) {
      throw new BadRequestException('Appointment is already cancelled');
    }

    appointment.status = AppointmentStatus.CANCELLED;

    await appointment.save();

    void this.notificationsService.notifyAppointmentCancelled(appointment, 'patient');

    return appointment;
  }
}

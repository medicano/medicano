import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';

import {
  Appointment,
  AppointmentDocument,
  AppointmentStatus,
} from './schemas/appointment.schema';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { GetAppointmentsQueryDto } from './dto/get-appointments-query.dto';
import { UpdateAppointmentStatusDto } from './dto/update-appointment-status.dto';
import { AvailabilityService } from '../availability/availability.service';
import { NotificationsService } from '../notifications/notifications.service';

const VALID_TRANSITIONS: Partial<Record<AppointmentStatus, AppointmentStatus[]>> = {
  [AppointmentStatus.SCHEDULED]: [
    AppointmentStatus.CONFIRMED,
    AppointmentStatus.CANCELLED,
  ],
  [AppointmentStatus.CONFIRMED]: [
    AppointmentStatus.COMPLETED,
    AppointmentStatus.CANCELLED,
  ],
};

@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);

  constructor(
    @InjectModel(Appointment.name)
    private readonly appointmentModel: Model<AppointmentDocument>,
    private readonly availabilityService: AvailabilityService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(dto: CreateAppointmentDto): Promise<AppointmentDocument> {
    const endAt = this.computeEndAt(dto.startAt, dto.durationMinutes);
    await this.validateDateRange(dto.startAt, endAt);
    await this.validateAvailability(dto.professionalId, dto.startAt, endAt);
    await this.checkConflict(dto.professionalId, dto.startAt, endAt);
    await this.checkCrossClinicInterval(
      dto.professionalId,
      dto.startAt,
      endAt,
    );

    const appointment = new this.appointmentModel({ ...dto, endAt });
    const createdAppointment = await appointment.save();

    void this.notificationsService
      .notifyAppointmentCreated(createdAppointment)
      .catch((error: unknown) =>
        this.logger.warn(
          `Failed to send appointment created notification: ${error instanceof Error ? error.message : 'unknown error'}`,
        ),
      );

    return createdAppointment;
  }

  async createForPatient(
    dto: CreateAppointmentDto,
    patientId: string,
  ): Promise<AppointmentDocument> {
    const endAt = this.computeEndAt(dto.startAt, dto.durationMinutes);
    await this.validateDateRange(dto.startAt, endAt);
    await this.validateAvailability(dto.professionalId, dto.startAt, endAt);
    await this.checkConflict(dto.professionalId, dto.startAt, endAt);
    await this.checkCrossClinicInterval(
      dto.professionalId,
      dto.startAt,
      endAt,
    );

    const appointment = new this.appointmentModel({
      ...dto,
      endAt,
      patientId,
    });
    const createdAppointment = await appointment.save();

    void this.notificationsService
      .notifyAppointmentCreated(createdAppointment)
      .catch((error: unknown) =>
        this.logger.warn(
          `Failed to send appointment created notification: ${error instanceof Error ? error.message : 'unknown error'}`,
        ),
      );

    return createdAppointment;
  }

  async findAll(query?: GetAppointmentsQueryDto): Promise<AppointmentDocument[]> {
    const filter: FilterQuery<AppointmentDocument> = {};

    if (query?.professionalId && Types.ObjectId.isValid(query.professionalId)) {
      filter.professionalId = new Types.ObjectId(query.professionalId);
    }
    if (query?.clinicId && Types.ObjectId.isValid(query.clinicId)) {
      filter.clinicId = new Types.ObjectId(query.clinicId);
    }
    if (query?.patientId && Types.ObjectId.isValid(query.patientId)) {
      filter.patientId = new Types.ObjectId(query.patientId);
    }
    if (query?.status) {
      filter.status = query.status;
    }
    if (query?.dateFrom || query?.dateTo) {
      const startAt: { $gte?: Date; $lte?: Date } = {};
      if (query.dateFrom) startAt.$gte = new Date(query.dateFrom);
      if (query.dateTo) startAt.$lte = new Date(query.dateTo);
      filter.startAt = startAt;
    }

    return this.appointmentModel.find(filter).exec();
  }

  async findById(id: string): Promise<AppointmentDocument> {
    const appointment = await this.appointmentModel.findById(id).exec();
    if (!appointment) {
      throw new NotFoundException(`Appointment with id ${id} not found`);
    }
    return appointment;
  }

  async update(
    id: string,
    dto: UpdateAppointmentDto,
  ): Promise<AppointmentDocument> {
    const appointment = await this.findById(id);

    if (dto.startAt || dto.durationMinutes) {
      const startAt = dto.startAt ?? appointment.startAt.toISOString();
      const durationMinutes = dto.durationMinutes ?? appointment.durationMinutes;
      const endAt = this.computeEndAt(startAt, durationMinutes);
      await this.validateDateRange(startAt, endAt);
      await this.checkConflict(
        appointment.professionalId.toString(),
        startAt,
        endAt,
        id,
      );
      await this.checkCrossClinicInterval(
        appointment.professionalId.toString(),
        startAt,
        endAt,
        id,
      );
      Object.assign(appointment, dto, { endAt });
    } else {
      Object.assign(appointment, dto);
    }
    return appointment.save();
  }

  async updateStatus(
    id: string,
    dto: UpdateAppointmentStatusDto,
  ): Promise<AppointmentDocument> {
    const appointment = await this.findById(id);

    if (
      appointment.status === AppointmentStatus.COMPLETED ||
      appointment.status === AppointmentStatus.CANCELLED
    ) {
      throw new ConflictException(`Appointment is already ${appointment.status}`);
    }

    const allowed = VALID_TRANSITIONS[appointment.status] ?? [];
    if (!allowed.includes(dto.status)) {
      throw new ConflictException(
        `Invalid status transition: ${appointment.status} → ${dto.status}`,
      );
    }

    appointment.status = dto.status;
    const updatedAppointment = await appointment.save();

    if (dto.status === AppointmentStatus.CONFIRMED) {
      void this.notificationsService
        .notifyAppointmentConfirmed(updatedAppointment)
        .catch((error: unknown) =>
          this.logger.warn(
            `Failed to send appointment confirmed notification: ${error instanceof Error ? error.message : 'unknown error'}`,
          ),
        );
    }

    if (dto.status === AppointmentStatus.CANCELLED) {
      void this.notificationsService
        .notifyAppointmentCancelled(updatedAppointment, 'provider')
        .catch((error: unknown) =>
          this.logger.warn(
            `Failed to send appointment cancelled notification: ${error instanceof Error ? error.message : 'unknown error'}`,
          ),
        );
    }

    return updatedAppointment;
  }

  async cancel(id: string): Promise<AppointmentDocument> {
    const appointment = await this.findById(id);

    if (
      appointment.status === AppointmentStatus.CANCELLED ||
      appointment.status === AppointmentStatus.COMPLETED
    ) {
      throw new ConflictException(
        `Cannot cancel appointment with status ${appointment.status}`,
      );
    }

    appointment.status = AppointmentStatus.CANCELLED;
    const cancelledAppointment = await appointment.save();

    void this.notificationsService
      .notifyAppointmentCancelled(cancelledAppointment, 'provider')
      .catch((error: unknown) =>
        this.logger.warn(
          `Failed to send appointment cancelled notification: ${error instanceof Error ? error.message : 'unknown error'}`,
        ),
      );

    return cancelledAppointment;
  }

  async cancelAsPatient(
    id: string,
    patientUserId: string,
  ): Promise<AppointmentDocument> {
    const appointment = await this.findById(id);

    if (appointment.patientId.toString() !== patientUserId) {
      throw new ForbiddenException('You are not the patient of this appointment');
    }

    if (
      appointment.status === AppointmentStatus.CANCELLED ||
      appointment.status === AppointmentStatus.COMPLETED
    ) {
      throw new ConflictException(
        `Cannot cancel appointment with status ${appointment.status}`,
      );
    }

    appointment.status = AppointmentStatus.CANCELLED;
    const cancelledAppointment = await appointment.save();

    void this.notificationsService
      .notifyAppointmentCancelled(cancelledAppointment, 'patient')
      .catch((error: unknown) =>
        this.logger.warn(
          `Failed to send appointment cancelled notification: ${error instanceof Error ? error.message : 'unknown error'}`,
        ),
      );

    return cancelledAppointment;
  }

  async remove(id: string): Promise<void> {
    const appointment = await this.findById(id);
    await appointment.deleteOne();
  }

  async checkConflict(
    professionalId: string,
    startAt: string,
    endAt: string,
    excludeId?: string,
  ): Promise<void> {
    const filter: FilterQuery<AppointmentDocument> = {
      professionalId: new Types.ObjectId(professionalId),
      status: { $nin: [AppointmentStatus.CANCELLED] },
      $or: [
        {
          startAt: { $lt: new Date(endAt) },
          endAt: { $gt: new Date(startAt) },
        },
      ],
    };

    if (excludeId) {
      filter._id = { $ne: new Types.ObjectId(excludeId) };
    }

    const conflict = await this.appointmentModel.findOne(filter).exec();
    if (conflict) {
      throw new ConflictException(
        'Professional already has an appointment in this time slot',
      );
    }
  }

  async checkCrossClinicInterval(
    professionalId: string,
    startAt: string,
    endAt: string,
    excludeId?: string,
  ): Promise<void> {
    const INTERVAL_MINUTES = 60;
    const intervalMs = INTERVAL_MINUTES * 60 * 1000;

    const rangeStart = new Date(new Date(startAt).getTime() - intervalMs);
    const rangeEnd = new Date(new Date(endAt).getTime() + intervalMs);

    const filter: FilterQuery<AppointmentDocument> = {
      professionalId: new Types.ObjectId(professionalId),
      status: { $nin: [AppointmentStatus.CANCELLED] },
      $or: [
        {
          startAt: { $lt: rangeEnd },
          endAt: { $gt: rangeStart },
        },
      ],
    };

    if (excludeId) {
      filter._id = { $ne: new Types.ObjectId(excludeId) };
    }

    const nearby = await this.appointmentModel.findOne(filter).exec();
    if (nearby) {
      throw new ConflictException(
        `Professional needs at least ${INTERVAL_MINUTES} minutes between appointments at different clinics`,
      );
    }
  }

  private computeEndAt(startAt: string, durationMinutes: number): string {
    return new Date(new Date(startAt).getTime() + durationMinutes * 60 * 1000).toISOString();
  }

  validateDateRange(startAt: string, endAt: string): void {
    const start = new Date(startAt);
    const end = new Date(endAt);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new ConflictException('Invalid date format for startAt or endAt');
    }

    if (start >= end) {
      throw new ConflictException('startAt must be before endAt');
    }
  }

  private async validateAvailability(
    professionalId: string,
    startAt: string,
    endAt: string,
  ): Promise<void> {
    const requestedStartAt = new Date(startAt);
    const requestedEndAt = new Date(endAt);
    const dateString = requestedStartAt.toISOString().slice(0, 10);

    const availableSlots = await this.availabilityService.getAvailableSlots(
      professionalId,
      dateString,
    );

    const hasExactSlot = availableSlots.some(
      (slot) =>
        slot.startAt.getTime() === requestedStartAt.getTime() &&
        slot.endAt.getTime() === requestedEndAt.getTime(),
    );

    if (!hasExactSlot) {
      throw new ConflictException(
        'Selected time is not available for this professional',
      );
    }
  }
}

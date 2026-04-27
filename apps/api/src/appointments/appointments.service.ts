import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
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
  constructor(
    @InjectModel(Appointment.name)
    private readonly appointmentModel: Model<AppointmentDocument>,
  ) {}

  async create(dto: CreateAppointmentDto): Promise<AppointmentDocument> {
    await this.validateDateRange(dto.startAt, dto.endAt);
    await this.checkConflict(dto.professionalId, dto.startAt, dto.endAt);
    await this.checkCrossClinicInterval(
      dto.professionalId,
      dto.startAt,
      dto.endAt,
    );

    const appointment = new this.appointmentModel(dto);
    return appointment.save();
  }

  async createForPatient(
    dto: CreateAppointmentDto,
    patientId: string,
  ): Promise<AppointmentDocument> {
    await this.validateDateRange(dto.startAt, dto.endAt);
    await this.checkConflict(dto.professionalId, dto.startAt, dto.endAt);
    await this.checkCrossClinicInterval(
      dto.professionalId,
      dto.startAt,
      dto.endAt,
    );

    const appointment = new this.appointmentModel({
      ...dto,
      patientId,
    });
    return appointment.save();
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

    if (dto.startAt || dto.endAt) {
      const startAt = dto.startAt ?? appointment.startAt.toISOString();
      const endAt = dto.endAt ?? appointment.endAt.toISOString();
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
    }

    Object.assign(appointment, dto);
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
    return appointment.save();
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
    return appointment.save();
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
    return appointment.save();
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
}

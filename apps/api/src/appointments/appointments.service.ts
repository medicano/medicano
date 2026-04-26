import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
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
import { ClinicsService } from '../clinics/clinics.service';

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectModel(Appointment.name)
    private readonly appointmentModel: Model<AppointmentDocument>,
    private readonly clinicsService: ClinicsService,
  ) {}

  async create(dto: CreateAppointmentDto): Promise<AppointmentDocument> {
    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);

    this.validateDateRange(startAt, endAt);

    await this.checkConflict(
      dto.professionalId,
      startAt,
      endAt,
      dto.clinicId,
    );

    const appointment = new this.appointmentModel({
      ...dto,
      startAt,
      endAt,
      status: AppointmentStatus.SCHEDULED,
    });

    return appointment.save();
  }

  async createForPatient(
    dto: CreateAppointmentDto,
  ): Promise<AppointmentDocument> {
    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);

    this.validateDateRange(startAt, endAt);

    await this.checkConflict(
      dto.professionalId,
      startAt,
      endAt,
      dto.clinicId,
    );

    await this.checkCrossClinicInterval(
      dto.patientId,
      dto.clinicId,
      startAt,
      endAt,
    );

    const appointment = new this.appointmentModel({
      ...dto,
      startAt,
      endAt,
      status: AppointmentStatus.SCHEDULED,
    });

    return appointment.save();
  }

  async findAll(): Promise<AppointmentDocument[]> {
    return this.appointmentModel.find().exec();
  }

  async findById(id: string): Promise<AppointmentDocument> {
    const appointment = await this.appointmentModel.findById(id).exec();
    if (!appointment) {
      throw new NotFoundException(`Appointment ${id} not found`);
    }
    return appointment;
  }

  async update(
    id: string,
    dto: UpdateAppointmentDto,
  ): Promise<AppointmentDocument> {
    const appointment = await this.findById(id);

    const startAt = dto.startAt ? new Date(dto.startAt) : appointment.startAt;
    const endAt = dto.endAt ? new Date(dto.endAt) : appointment.endAt;

    this.validateDateRange(startAt, endAt);

    const clinicId =
      typeof appointment.clinicId === 'string'
        ? appointment.clinicId
        : (appointment.clinicId as unknown as Types.ObjectId).toString();

    const professionalId =
      typeof appointment.professionalId === 'string'
        ? appointment.professionalId
        : (appointment.professionalId as unknown as Types.ObjectId).toString();

    await this.checkConflict(
      professionalId,
      startAt,
      endAt,
      clinicId,
      appointment._id.toString(),
    );

    Object.assign(appointment, dto, { startAt, endAt });
    return appointment.save();
  }

  async remove(id: string): Promise<void> {
    const result = await this.appointmentModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Appointment ${id} not found`);
    }
  }

  private validateDateRange(startAt: Date, endAt: Date): void {
    if (endAt <= startAt) {
      throw new BadRequestException('endAt must be after startAt');
    }
  }

  private async checkConflict(
    professionalId: string,
    startAt: Date,
    endAt: Date,
    clinicId: string,
    excludeId?: string,
  ): Promise<void> {
    const clinic = await this.clinicsService.findById(clinicId);
    const linkedScheduling = clinic?.linkedScheduling ?? false;

    const overlapCondition = linkedScheduling
      ? {
          startAt: { $lt: endAt },
          endAt: { $gt: startAt },
        }
      : {
          startAt: { $lte: endAt },
          endAt: { $gte: startAt },
        };

    const query: FilterQuery<AppointmentDocument> = {
      professionalId,
      clinicId,
      status: { $nin: [AppointmentStatus.CANCELLED] },
      ...overlapCondition,
    };

    if (excludeId) {
      query._id = { $ne: excludeId };
    }

    const conflict = await this.appointmentModel.findOne(query).exec();

    if (conflict) {
      throw new ConflictException(
        'Appointment conflicts with an existing appointment for this professional at this clinic',
      );
    }
  }

  private async checkCrossClinicInterval(
    patientId: string,
    clinicId: string,
    startAt: Date,
    endAt: Date,
  ): Promise<void> {
    const THIRTY_MINUTES_MS = 30 * 60 * 1000;
    const windowStart = new Date(startAt.getTime() - THIRTY_MINUTES_MS);
    const windowEnd = new Date(endAt.getTime() + THIRTY_MINUTES_MS);

    const conflict = await this.appointmentModel
      .findOne({
        patientId,
        clinicId: { $ne: clinicId },
        status: { $nin: [AppointmentStatus.CANCELLED] },
        startAt: { $lt: windowEnd },
        endAt: { $gt: windowStart },
      })
      .exec();

    if (conflict) {
      throw new ConflictException(
        'Patient has another appointment at a different clinic within 30 minutes',
      );
    }
  }
}

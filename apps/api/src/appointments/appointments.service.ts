import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
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
import { Role } from '../common/enums/role.enum';

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectModel(Appointment.name)
    private readonly appointmentModel: Model<AppointmentDocument>,
    private readonly clinicsService: ClinicsService,
  ) {}

  async create(dto: CreateAppointmentDto, userId: string): Promise<AppointmentDocument> {
    await this.checkConflict(
      dto.professionalId,
      dto.startAt,
      dto.endAt,
      dto.clinicId,
    );

    const appointment = new this.appointmentModel({
      ...dto,
      professionalId: new Types.ObjectId(dto.professionalId),
      clinicId: new Types.ObjectId(dto.clinicId),
      patientId: new Types.ObjectId(dto.patientId),
      createdBy: new Types.ObjectId(userId),
      status: AppointmentStatus.PENDING,
    });

    return appointment.save();
  }

  async createForPatient(
    dto: CreateAppointmentDto,
    attendantUser: { userId: string; clinicId: string },
  ): Promise<AppointmentDocument> {
    await this.checkConflict(
      dto.professionalId,
      dto.startAt,
      dto.endAt,
      dto.clinicId,
    );

    const appointment = new this.appointmentModel({
      ...dto,
      professionalId: new Types.ObjectId(dto.professionalId),
      clinicId: new Types.ObjectId(dto.clinicId),
      patientId: new Types.ObjectId(dto.patientId),
      createdBy: new Types.ObjectId(attendantUser.userId),
      status: AppointmentStatus.PENDING,
    });

    return appointment.save();
  }

  async findAll(user: { userId: string; role: string; clinicId?: string }): Promise<AppointmentDocument[]> {
    const filter: FilterQuery<AppointmentDocument> = {};

    if (user.role === Role.CLINIC && user.clinicId) {
      filter.clinicId = new Types.ObjectId(user.clinicId);
    } else if (user.role === Role.PROFESSIONAL) {
      filter.professionalId = new Types.ObjectId(user.userId);
    } else if (user.role === Role.PATIENT) {
      filter.patientId = new Types.ObjectId(user.userId);
    }

    return this.appointmentModel.find(filter).sort({ startAt: 1 }).exec();
  }

  async findById(id: string): Promise<AppointmentDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid appointment ID');
    }

    const appointment = await this.appointmentModel.findById(id).exec();
    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    return appointment;
  }

  async update(
    id: string,
    dto: UpdateAppointmentDto,
    user: { userId: string; role: string },
  ): Promise<AppointmentDocument> {
    const appointment = await this.findById(id);

    if (
      user.role === Role.PROFESSIONAL &&
      appointment.professionalId.toString() !== user.userId
    ) {
      throw new ForbiddenException('You can only update your own appointments');
    }

    if (dto.startAt || dto.endAt) {
      await this.checkConflict(
        appointment.professionalId.toString(),
        dto.startAt ?? appointment.startAt.toISOString(),
        dto.endAt ?? appointment.endAt.toISOString(),
        appointment.clinicId.toString(),
        id,
      );
    }

    Object.assign(appointment, dto);
    return appointment.save();
  }

  async cancel(
    id: string,
    user: { userId: string; role: string },
  ): Promise<AppointmentDocument> {
    const appointment = await this.findById(id);

    if (appointment.status === AppointmentStatus.CANCELLED) {
      throw new BadRequestException('Appointment is already cancelled');
    }

    if (
      user.role === Role.PATIENT &&
      appointment.patientId.toString() !== user.userId
    ) {
      throw new ForbiddenException('You can only cancel your own appointments');
    }

    appointment.status = AppointmentStatus.CANCELLED;
    return appointment.save();
  }

  async confirm(
    id: string,
    user: { userId: string; role: string },
  ): Promise<AppointmentDocument> {
    const appointment = await this.findById(id);

    if (appointment.status !== AppointmentStatus.PENDING) {
      throw new BadRequestException('Only pending appointments can be confirmed');
    }

    if (
      user.role === Role.PROFESSIONAL &&
      appointment.professionalId.toString() !== user.userId
    ) {
      throw new ForbiddenException('You can only confirm your own appointments');
    }

    appointment.status = AppointmentStatus.CONFIRMED;
    return appointment.save();
  }

  private async checkConflict(
    professionalId: string,
    startAt: string,
    endAt: string,
    clinicId: string,
    excludeId?: string,
  ): Promise<void> {
    const clinic = await this.clinicsService.findById(clinicId);
    const linkedScheduling = clinic?.linkedScheduling ?? false;

    const startDate = new Date(startAt);
    const endDate = new Date(endAt);

    // RN03/RN25: linkedScheduling=true allows back-to-back appointments (strict overlap only).
    // linkedScheduling=false blocks boundary-touching appointments as well (inclusive bounds).
    const overlapFilter = linkedScheduling
      ? { startAt: { $lt: endDate }, endAt: { $gt: startDate } }
      : { startAt: { $lte: endDate }, endAt: { $gte: startDate } };

    const filter: FilterQuery<AppointmentDocument> = {
      professionalId: new Types.ObjectId(professionalId),
      clinicId: new Types.ObjectId(clinicId),
      status: { $nin: [AppointmentStatus.CANCELLED] },
      ...overlapFilter,
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
}

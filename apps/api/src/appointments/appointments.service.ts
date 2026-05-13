import {
  BadRequestException,
  ConflictException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { AvailabilityService } from '../availability/availability.service';
import { ClinicsService } from '../clinics/clinics.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { UpdateAppointmentStatusDto } from './dto/update-appointment-status.dto';
import { GetAppointmentsQueryDto } from './dto/get-appointments-query.dto';
import {
  Appointment,
  AppointmentDocument,
  AppointmentStatus,
  VALID_STATUS_TRANSITIONS,
} from './schemas/appointment.schema';

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectModel(Appointment.name)
    private readonly appointmentModel: Model<AppointmentDocument>,
    @Inject(forwardRef(() => AvailabilityService))
    private readonly availabilityService: AvailabilityService,
    private readonly clinicsService: ClinicsService,
  ) {}

  async createAppointment(dto: CreateAppointmentDto): Promise<AppointmentDocument> {
    const startTime = (dto as any).startTime ?? (dto as any).startAt;
    const endTime = (dto as any).endTime ?? (dto as any).endAt;
    await this.checkConflict(
      String(dto.professionalId),
      startTime,
      endTime,
      String(dto.clinicId),
    );
    return this.appointmentModel.create(dto);
  }

  async checkConflict(
    professionalId: string,
    startTime: Date,
    endTime: Date,
    clinicId: string,
  ): Promise<void> {
    const clinic = await this.clinicsService.findById(clinicId);
    const linkedScheduling = clinic.linkedScheduling ?? false;

    const existing = await this.appointmentModel.find({
      professionalId,
      startAt: { $lte: endTime },
      endAt: { $gte: startTime },
    });

    for (const appt of existing) {
      const isAdjacent =
        appt.endAt.getTime() === startTime.getTime() ||
        endTime.getTime() === appt.startAt.getTime();

      if (isAdjacent && linkedScheduling) {
        continue;
      }

      throw new ConflictException(
        'Appointment conflicts with an existing appointment',
      );
    }
  }

  async getAvailableSlotsForDay(
    professionalId: string,
    date: string,
  ): Promise<unknown[]> {
    return this.availabilityService.getAvailableSlotsForDay(
      professionalId,
      date,
    );
  }

  async create(createAppointmentDto: CreateAppointmentDto): Promise<AppointmentDocument> {
    const { professionalId, startAt } = createAppointmentDto;

    const startAtDate = new Date(startAt);
    const dateString = startAtDate.toISOString().slice(0, 10);

    await this.validateAvailability(professionalId, dateString, startAtDate);

    const appointment = new this.appointmentModel(createAppointmentDto);
    return appointment.save();
  }

  async findAll(query: GetAppointmentsQueryDto): Promise<AppointmentDocument[]> {
    const filter: FilterQuery<AppointmentDocument> = {};

    if (query.clinicId) filter.clinicId = new Types.ObjectId(query.clinicId);
    if (query.professionalId) filter.professionalId = new Types.ObjectId(query.professionalId);
    if (query.patientId) filter.patientId = new Types.ObjectId(query.patientId);
    if (query.status) filter.status = query.status;

    if (query.date) {
      const dayStart = new Date(query.date);
      const dayEnd = new Date(query.date);
      dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);
      filter.startAt = { $gte: dayStart, $lt: dayEnd };
    } else if (query.dateFrom || query.dateTo) {
      filter.startAt = {};
      if (query.dateFrom) (filter.startAt as Record<string, Date>).$gte = new Date(query.dateFrom);
      if (query.dateTo) (filter.startAt as Record<string, Date>).$lte = new Date(query.dateTo);
    }

    return this.appointmentModel.find(filter).exec();
  }

  async findById(id: string): Promise<AppointmentDocument> {
    const appointment = await this.appointmentModel.findById(id);
    if (!appointment) {
      throw new NotFoundException(`Appointment with id ${id} not found`);
    }
    return appointment;
  }

  async update(
    id: string,
    updateAppointmentDto: UpdateAppointmentDto,
  ): Promise<AppointmentDocument> {
    const appointment = await this.appointmentModel
      .findByIdAndUpdate(id, updateAppointmentDto, { new: true })
      .exec();

    if (!appointment) {
      throw new NotFoundException(`Appointment with id ${id} not found`);
    }

    return appointment;
  }

  async updateStatus(id: string, dto: UpdateAppointmentStatusDto): Promise<AppointmentDocument> {
    const appointment = await this.findById(id);

    const validTransitions = VALID_STATUS_TRANSITIONS[appointment.status];
    if (!validTransitions.includes(dto.status)) {
      throw new BadRequestException(
        `Cannot transition from ${appointment.status} to ${dto.status}`,
      );
    }

    appointment.status = dto.status;
    return appointment.save();
  }

  async cancel(id: string): Promise<void> {
    const appointment = await this.findById(id);

    if (!VALID_STATUS_TRANSITIONS[appointment.status].includes(AppointmentStatus.CANCELLED)) {
      throw new BadRequestException(
        `Cannot cancel appointment with status ${appointment.status}`,
      );
    }

    appointment.status = AppointmentStatus.CANCELLED;
    await appointment.save();
  }

  private async validateAvailability(
    professionalId: string,
    dateString: string,
    startAt: Date,
  ): Promise<void> {
    const availableSlots = await this.availabilityService.getAvailableSlotsForDay(
      professionalId,
      dateString,
    );

    const isAvailable = availableSlots.some(
      (slot) => slot.startAt.getTime() === startAt.getTime(),
    );

    if (!isAvailable) {
      throw new BadRequestException(
        'The requested time slot is not available for this professional',
      );
    }
  }
}

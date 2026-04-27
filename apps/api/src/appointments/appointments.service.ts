import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AvailabilityService } from '../availability/availability.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { Appointment } from './schemas/appointment.schema';

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectModel(Appointment.name)
    private readonly appointmentModel: Model<Appointment>,
    private readonly availabilityService: AvailabilityService,
  ) {}

  async create(createAppointmentDto: CreateAppointmentDto): Promise<Appointment> {
    const { professionalId, startAt } = createAppointmentDto;

    const startAtDate = new Date(startAt);
    const dateString = startAtDate.toISOString().slice(0, 10);

    await this.validateAvailability(professionalId, dateString, startAtDate);

    const appointment = new this.appointmentModel(createAppointmentDto);
    return appointment.save();
  }

  async findAll(): Promise<Appointment[]> {
    return this.appointmentModel.find().exec();
  }

  async findOne(id: string): Promise<Appointment> {
    const appointment = await this.appointmentModel.findById(id).exec();
    if (!appointment) {
      throw new NotFoundException(`Appointment with id ${id} not found`);
    }
    return appointment;
  }

  async update(
    id: string,
    updateAppointmentDto: UpdateAppointmentDto,
  ): Promise<Appointment> {
    const appointment = await this.appointmentModel
      .findByIdAndUpdate(id, updateAppointmentDto, { new: true })
      .exec();

    if (!appointment) {
      throw new NotFoundException(`Appointment with id ${id} not found`);
    }

    return appointment;
  }

  async remove(id: string): Promise<void> {
    const result = await this.appointmentModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Appointment with id ${id} not found`);
    }
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
      (slot) =>
        slot.startAt.getTime() === startAt.getTime(),
    );

    if (!isAvailable) {
      throw new BadRequestException(
        'The requested time slot is not available for this professional',
      );
    }
  }
}

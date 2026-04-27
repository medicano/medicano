import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Appointment } from '../../appointments/schemas/appointment.schema';
import { AvailabilityService } from '../availability.service';
import { GetScheduleQueryDto } from '../dto/get-schedule-query.dto';

@Injectable()
export class ScheduleService {
  constructor(
    @InjectModel(Appointment.name)
    private readonly appointmentModel: Model<Appointment>,
    private readonly availabilityService: AvailabilityService,
  ) {}

  async getProviderSchedule(
    professionalId: string,
    query: GetScheduleQueryDto,
  ) {
    const availableSlots = await this.availabilityService.getAvailableSlots(
      professionalId,
      query.fromDate,
      query.toDate,
    );

    const fromDate = new Date(query.fromDate);
    const toDate = new Date(query.toDate);
    toDate.setUTCHours(23, 59, 59, 999);

    const appointments = await this.appointmentModel
      .find({
        professionalId,
        startAt: { $gte: fromDate, $lte: toDate },
        status: { $in: ['confirmed', 'pending'] },
      })
      .exec();

    return {
      availableSlots,
      appointments,
    };
  }
}

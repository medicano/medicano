import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Appointment } from '../appointments/schemas/appointment.schema';
import { Professional } from '../professionals/schemas/professional.schema';
import { AvailableSlotDto } from './dto/available-slot.dto';

@Injectable()
export class AvailabilityService {
  constructor(
    @InjectModel(Appointment.name)
    private readonly appointmentModel: Model<Appointment>,
    @InjectModel(Professional.name)
    private readonly professionalModel: Model<Professional>,
  ) {}

  async getAvailableSlots(
    professionalId: string,
    fromDate: string,
    toDate: string,
  ): Promise<AvailableSlotDto[]> {
    const start = this.normalizeDateToUtcMidnight(fromDate);
    const end = this.normalizeDateToUtcMidnight(toDate);

    if (end < start) {
      throw new BadRequestException('fromDate must be <= toDate');
    }

    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    const rangeDays =
      Math.floor((end.getTime() - start.getTime()) / ONE_DAY_MS) + 1;

    if (rangeDays > 30) {
      throw new BadRequestException('Date range too large; maximum 30 days');
    }

    const allSlots: AvailableSlotDto[] = [];
    for (let i = 0; i < rangeDays; i++) {
      const dayCursor = new Date(start);
      dayCursor.setUTCDate(dayCursor.getUTCDate() + i);
      const isoDate = dayCursor.toISOString().slice(0, 10);

      const daySlots = await this.getAvailableSlotsForDay(
        professionalId,
        isoDate,
      );
      allSlots.push(...daySlots);
    }

    return allSlots.sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
  }

  async getAvailableSlotsForDay(
    professionalId: string,
    dateString: string,
  ): Promise<AvailableSlotDto[]> {
    // Use local midnight so setHours() below lands on the correct calendar day
    const targetDate = new Date(dateString + 'T00:00:00');
    const dayOfWeek = targetDate.getDay();

    const professional = await this.professionalModel
      .findById(professionalId)
      .exec();

    if (!professional) {
      return [];
    }

    const weeklySlots = (professional.weeklySlots ?? []).filter(
      (slot: { dayOfWeek: number; startTime: string; endTime: string }) =>
        slot.dayOfWeek === dayOfWeek,
    );

    if (weeklySlots.length === 0) {
      return [];
    }

    const nextDayDate = new Date(targetDate.getTime() + 24 * 60 * 60 * 1000);

    const existingAppointments = await this.appointmentModel
      .find({
        professionalId,
        startAt: { $gte: targetDate, $lt: nextDayDate },
        status: { $in: ['scheduled', 'confirmed'] },
      })
      .exec();

    const availableSlots: AvailableSlotDto[] = [];

    for (const slot of weeklySlots) {
      const [startHour, startMinute] = slot.startTime.split(':').map(Number);
      const [endHour, endMinute] = slot.endTime.split(':').map(Number);

      const blockStart = new Date(targetDate);
      blockStart.setHours(startHour, startMinute, 0, 0);

      const blockEnd = new Date(targetDate);
      blockEnd.setHours(endHour, endMinute, 0, 0);

      const durationMs = (slot.slotDurationMinutes ?? 30) * 60 * 1000;
      const now = Date.now();
      let cursor = blockStart.getTime();

      while (cursor + durationMs <= blockEnd.getTime()) {
        if (cursor >= now) {
          const start = new Date(cursor);
          const end = new Date(cursor + durationMs);

          const hasOverlap = existingAppointments.some((appt) => {
            const apptStart = new Date(appt.startAt);
            const apptEnd = new Date(appt.endAt);
            return apptStart < end && apptEnd > start;
          });

          if (!hasOverlap) {
            availableSlots.push(new AvailableSlotDto({ startAt: start, endAt: end }));
          }
        }

        cursor += durationMs;
      }
    }

    return availableSlots;
  }

  private normalizeDateToUtcMidnight(dateString: string): Date {
    const [year, month, day] = dateString.slice(0, 10).split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  }
}

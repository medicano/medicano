import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
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

  async getConfig(professionalId: string): Promise<Record<string, unknown>> {
    const professional = await this.professionalModel.findById(professionalId).exec();
    const slots = (professional?.weeklySlots ?? []) as any[];
    const minCancelHours = (professional as any)?.minCancelNoticeHours ?? 24;

    const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const DAYS_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    const byDay: Record<string, any[]> = {};
    for (const slot of slots) {
      const key = DAY_KEYS[slot.dayOfWeek];
      if (!byDay[key]) byDay[key] = [];
      byDay[key].push(slot);
    }

    const days = DAYS_ORDER.map((key) => {
      const daySlots: any[] = (byDay[key] ?? []).sort((a: any, b: any) =>
        a.startTime.localeCompare(b.startTime),
      );
      if (daySlots.length === 0) {
        return { day: key, enabled: false, start: '08:00', end: '18:00', breaks: [] };
      }
      const start = daySlots[0].startTime;
      const end = daySlots[daySlots.length - 1].endTime;
      const breaks: { id: string; start: string; end: string }[] = [];
      for (let i = 0; i < daySlots.length - 1; i++) {
        breaks.push({ id: `b${i}`, start: daySlots[i].endTime, end: daySlots[i + 1].startTime });
      }
      return { day: key, enabled: true, start, end, breaks };
    });

    const duration = slots[0]?.slotDurationMinutes ?? 30;

    return {
      days,
      appointmentDuration: String(duration),
      minAdvance: '2h',
      minCancelAdvance: `${minCancelHours}h`,
    };
  }

  async saveConfig(professionalId: string, config: Record<string, unknown>): Promise<void> {
    const DAY_MAP: Record<string, number> = {
      sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
      thursday: 4, friday: 5, saturday: 6,
    };

    const duration = parseInt(String(config.appointmentDuration ?? '30')) || 30;
    const minCancelStr = String(config.minCancelAdvance ?? '24h');
    const minCancelHours = parseInt(minCancelStr) || 24;

    const days = (config.days as any[]) ?? [];
    const weeklySlots: any[] = [];

    for (const day of days) {
      if (!day.enabled) continue;
      const dayOfWeek = DAY_MAP[day.day as string];
      const breaks: any[] = [...(day.breaks ?? [])].sort((a: any, b: any) =>
        a.start.localeCompare(b.start),
      );

      if (breaks.length === 0) {
        weeklySlots.push({ dayOfWeek, startTime: day.start, endTime: day.end, slotDurationMinutes: duration });
      } else {
        if (day.start < breaks[0].start) {
          weeklySlots.push({ dayOfWeek, startTime: day.start, endTime: breaks[0].start, slotDurationMinutes: duration });
        }
        for (let i = 0; i < breaks.length - 1; i++) {
          if (breaks[i].end < breaks[i + 1].start) {
            weeklySlots.push({ dayOfWeek, startTime: breaks[i].end, endTime: breaks[i + 1].start, slotDurationMinutes: duration });
          }
        }
        const last = breaks[breaks.length - 1];
        if (last.end < day.end) {
          weeklySlots.push({ dayOfWeek, startTime: last.end, endTime: day.end, slotDurationMinutes: duration });
        }
      }
    }

    const professional = await this.professionalModel.findById(professionalId).exec();
    if (!professional) {
      throw new NotFoundException(`Profissional com ID ${professionalId} não encontrado`);
    }

    await this.professionalModel.collection.updateOne(
      { _id: professional._id },
      { $set: { weeklySlots, minCancelNoticeHours: minCancelHours } },
    );
  }

  async getAvailableSlots(
    professionalId: string,
    fromDate: string,
    toDate: string,
  ): Promise<AvailableSlotDto[]> {
    const start = this.normalizeDateToUtcMidnight(fromDate);
    const end = this.normalizeDateToUtcMidnight(toDate);

    if (end < start) {
      throw new BadRequestException('A data inicial deve ser anterior ou igual à data final');
    }

    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    const rangeDays =
      Math.floor((end.getTime() - start.getTime()) / ONE_DAY_MS) + 1;

    if (rangeDays > 30) {
      throw new BadRequestException('Intervalo de datas muito grande; máximo de 30 dias');
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
      const todayMidnight = new Date();
      todayMidnight.setHours(0, 0, 0, 0);
      const isToday = targetDate.getTime() === todayMidnight.getTime();
      let cursor = blockStart.getTime();

      while (cursor + durationMs <= blockEnd.getTime()) {
        const isFutureSlot = !isToday || cursor >= now;
        if (isFutureSlot) {
          const start = new Date(cursor);
          const end = new Date(cursor + durationMs);

          const hasOverlap = existingAppointments.some((appt) => {
            const apptStart = new Date(appt.startAt);
            const apptEnd = new Date(appt.endAt);
            return apptStart < end && apptEnd > start;
          });

          if (!hasOverlap) {
            availableSlots.push(
              new AvailableSlotDto({
                startAt: start,
                endAt: end,
                durationMinutes: slot.slotDurationMinutes ?? 30,
              }),
            );
          }
        }

        cursor += durationMs;
      }
    }

    return availableSlots;
  }

  async getNextAvailableDay(
    professionalId: string,
    maxDays = 30,
  ): Promise<{ date: string; slots: AvailableSlotDto[] } | null> {
    const professional = await this.professionalModel.findById(professionalId).exec();
    if (!professional || !(professional.weeklySlots ?? []).length) return null;

    const now = Date.now();
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);

    for (let i = 1; i <= maxDays; i++) {
      const targetDate = new Date(todayMidnight.getTime() + i * 24 * 60 * 60 * 1000);
      const dayOfWeek = targetDate.getDay();

      const weeklySlots = (professional.weeklySlots ?? []).filter(
        (s: any) => s.dayOfWeek === dayOfWeek,
      );
      if (weeklySlots.length === 0) continue;

      const nextDay = new Date(targetDate.getTime() + 24 * 60 * 60 * 1000);
      const existing = await this.appointmentModel.find({
        professionalId,
        startAt: { $gte: targetDate, $lt: nextDay },
        status: { $in: ['scheduled', 'confirmed'] },
      }).exec();

      const daySlots: AvailableSlotDto[] = [];
      for (const slot of weeklySlots) {
        const [sh, sm] = (slot as any).startTime.split(':').map(Number);
        const [eh, em] = (slot as any).endTime.split(':').map(Number);
        const blockStart = new Date(targetDate); blockStart.setHours(sh, sm, 0, 0);
        const blockEnd = new Date(targetDate); blockEnd.setHours(eh, em, 0, 0);
        const durationMs = ((slot as any).slotDurationMinutes ?? 30) * 60 * 1000;
        let cursor = blockStart.getTime();
        while (cursor + durationMs <= blockEnd.getTime()) {
          const start = new Date(cursor);
          const end = new Date(cursor + durationMs);
          const taken = existing.some(a => new Date(a.startAt) < end && new Date(a.endAt) > start);
          if (!taken)
            daySlots.push(
              new AvailableSlotDto({
                startAt: start,
                endAt: end,
                durationMinutes: (slot as any).slotDurationMinutes ?? 30,
              }),
            );
          cursor += durationMs;
        }
      }

      if (daySlots.length > 0) {
        return { date: targetDate.toISOString().slice(0, 10), slots: daySlots };
      }
    }

    return null;
  }

  private normalizeDateToUtcMidnight(dateString: string): Date {
    const [year, month, day] = dateString.slice(0, 10).split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  }
}

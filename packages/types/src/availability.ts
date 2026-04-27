export enum DayOfWeek {
  MONDAY = 'MONDAY',
  TUESDAY = 'TUESDAY',
  WEDNESDAY = 'WEDNESDAY',
  THURSDAY = 'THURSDAY',
  FRIDAY = 'FRIDAY',
  SATURDAY = 'SATURDAY',
  SUNDAY = 'SUNDAY',
}

export interface TimeSlot {
  startTime: string;
  endTime: string;
}

export interface AvailabilityRule {
  _id: string;
  professionalId: string;
  clinicId: string;
  dayOfWeek: DayOfWeek;
  timeSlots: TimeSlot[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAvailabilityRuleRequest {
  clinicId: string;
  dayOfWeek: DayOfWeek;
  timeSlots: TimeSlot[];
}

export interface UpdateAvailabilityRuleRequest {
  dayOfWeek?: DayOfWeek;
  timeSlots?: TimeSlot[];
  isActive?: boolean;
}

export interface AvailableSlot {
  date: string;
  startTime: string;
  endTime: string;
  professionalId: string;
  clinicId: string;
}

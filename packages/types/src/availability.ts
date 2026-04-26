export interface IWeeklyAvailabilityDay {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDuration: number;
}

export interface IProfessionalAvailability {
  _id?: string;
  professionalId: string;
  weeklyAvailability: IWeeklyAvailabilityDay[];
  unavailableDates: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface IAvailableSlot {
  start: string;
  end: string;
}

export interface IScheduleResponse {
  fromDate: string;
  toDate: string;
  availableSlots: IAvailableSlot[];
  appointments: any[];
}

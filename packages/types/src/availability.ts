export interface IGetAvailabilityQuery {
  professionalId: string;
  fromDate: string;
  toDate: string;
}

export interface IAvailableSlot {
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

export interface IScheduleItem {
  date: string;
  slots: IAvailableSlot[];
}

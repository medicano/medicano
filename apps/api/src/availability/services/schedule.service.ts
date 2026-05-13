import { Injectable } from '@nestjs/common';
import { AvailabilityService } from '../availability.service';

@Injectable()
export class ScheduleService {
  constructor(
    private readonly availabilityService: AvailabilityService,
  ) {}

  async getScheduleForRange(
    professionalId: string,
    fromDate: string,
    toDate: string,
  ) {
    return this.availabilityService.getAvailableSlots(
      professionalId,
      fromDate,
      toDate,
    );
  }
}

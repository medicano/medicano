export class AvailableSlotDto {
  readonly date: string;
  readonly startAt: Date;
  readonly endAt: Date;
  readonly durationMinutes: number;

  constructor(partial: Partial<AvailableSlotDto>) {
    Object.assign(this, partial);
  }
}

import { IsDateString } from 'class-validator';

export class GetAvailabilityQueryDto {
  @IsDateString()
  readonly fromDate: string;

  @IsDateString()
  readonly toDate: string;
}

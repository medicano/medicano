import { IsDateString } from 'class-validator';

export class GetScheduleQueryDto {
  @IsDateString()
  fromDate: string;

  @IsDateString()
  toDate: string;
}

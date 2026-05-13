import { IsMongoId, IsDateString, IsEnum, IsOptional } from 'class-validator';
import { AppointmentStatus } from '../schemas/appointment.schema';

export class GetAppointmentsQueryDto {
  @IsMongoId()
  @IsOptional()
  readonly clinicId?: string;

  @IsMongoId()
  @IsOptional()
  readonly professionalId?: string;

  @IsMongoId()
  @IsOptional()
  readonly patientId?: string;

  @IsDateString()
  @IsOptional()
  readonly date?: string;

  @IsDateString()
  @IsOptional()
  readonly dateFrom?: string;

  @IsDateString()
  @IsOptional()
  readonly dateTo?: string;

  @IsEnum(AppointmentStatus)
  @IsOptional()
  readonly status?: AppointmentStatus;
}

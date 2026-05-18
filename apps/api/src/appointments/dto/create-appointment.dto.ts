import {
  IsMongoId,
  IsDateString,
  IsInt,
  Min,
  Max,
  IsString,
  IsOptional,
} from 'class-validator';

export class CreateAppointmentDto {
  @IsMongoId()
  readonly clinicId: string;

  @IsMongoId()
  @IsOptional()
  readonly professionalId?: string;

  @IsMongoId()
  @IsOptional()
  readonly patientId?: string;

  @IsDateString()
  readonly startAt: string;

  @IsInt()
  @Min(15)
  @Max(480)
  @IsOptional()
  readonly durationMinutes?: number;

  @IsString()
  @IsOptional()
  readonly notes?: string;
}

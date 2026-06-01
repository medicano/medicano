import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDate,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  Gender,
  Sex,
  BloodType,
  PhysicalActivityLevel,
  SmokingStatus,
  AlcoholConsumption,
  IUpdatePatientProfileDto,
} from '@medicano/types';

export class MedicationDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  dose?: string;
}

export class AllergyDto {
  @IsString()
  substance!: string;

  @IsOptional()
  @IsString()
  reaction?: string;
}

export class UpdatePatientProfileDto implements IUpdatePatientProfileDto {
  @IsOptional()
  @IsBoolean()
  useInTriage?: boolean;

  // Demographics
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  birthDate?: Date;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsOptional()
  @IsEnum(Sex)
  sex?: Sex;

  // Biometrics
  @IsOptional()
  @IsNumber()
  @Min(0.5)
  @Max(500)
  weightKg?: number;

  @IsOptional()
  @IsNumber()
  @Min(20)
  @Max(250)
  heightCm?: number;

  @IsOptional()
  @IsEnum(BloodType)
  bloodType?: BloodType;

  // Lifestyle
  @IsOptional()
  @IsEnum(PhysicalActivityLevel)
  physicalActivityLevel?: PhysicalActivityLevel;

  @IsOptional()
  @IsEnum(SmokingStatus)
  smokingStatus?: SmokingStatus;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(200)
  smokingPackYears?: number;

  @IsOptional()
  @IsEnum(AlcoholConsumption)
  alcoholConsumption?: AlcoholConsumption;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(24)
  sleepHoursPerNight?: number;

  // Medical
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MedicationDto)
  medications?: MedicationDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AllergyDto)
  allergies?: AllergyDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  chronicConditions?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  familyHistory?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dietaryRestrictions?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  observations?: string;
}

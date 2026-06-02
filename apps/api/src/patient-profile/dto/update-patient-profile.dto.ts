import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDate,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  BiologicalSex,
  SmokingStatus,
  AlcoholUse,
  ActivityLevel,
  ImmuneStatus,
  LanguageLevel,
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
  useInAssistant?: boolean;

  // Demographics
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  birthDate?: Date;

  @IsOptional()
  @IsEnum(BiologicalSex)
  biologicalSex?: BiologicalSex;

  @IsOptional()
  @IsString()
  preferredName?: string;

  // Anthropometrics
  @IsOptional()
  @IsNumber()
  @Min(20)
  @Max(250)
  heightCm?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.5)
  @Max(500)
  weightKg?: number;

  // Reproductive
  @IsOptional()
  @IsBoolean()
  isPregnant?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(45)
  gestationalWeeks?: number;

  // Location
  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  country?: string;

  // Clinical history
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  chronicConditions?: string[];

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
  previousSurgeries?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  familyHistory?: string[];

  // Lifestyle
  @IsOptional()
  @IsEnum(SmokingStatus)
  smokingStatus?: SmokingStatus;

  @IsOptional()
  @IsEnum(AlcoholUse)
  alcoholUse?: AlcoholUse;

  @IsOptional()
  @IsEnum(ActivityLevel)
  activityLevel?: ActivityLevel;

  // Immune & exposure
  @IsOptional()
  @IsEnum(ImmuneStatus)
  immuneStatus?: ImmuneStatus;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  recentTravelCountries?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  animalExposure?: string[];

  // Contact preference
  @IsOptional()
  @IsEnum(LanguageLevel)
  languageLevel?: LanguageLevel;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  observations?: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  lastReviewedAt?: Date;
}

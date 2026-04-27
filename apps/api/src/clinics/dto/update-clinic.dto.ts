import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { AddressDto } from '../../common/dto/address.dto';
import { Specialty } from '../../common/enums/specialty.enum';
import { WeeklySlotDto } from '../../common/dto/weekly-slot.dto';
import { SubscriptionStatus } from '../schemas/clinic.schema';

export class UpdateClinicDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{14}$/, { message: 'cnpj must be 14 digits' })
  cnpj?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  phone?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  address?: AddressDto;

  @IsOptional()
  @IsArray()
  @IsEnum(Specialty, { each: true })
  @ArrayMinSize(1)
  specialties?: Specialty[];

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsEnum(SubscriptionStatus)
  subscriptionStatus?: SubscriptionStatus;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WeeklySlotDto)
  @ArrayMaxSize(50)
  weeklySlots?: WeeklySlotDto[];

  @IsOptional()
  @IsBoolean()
  autoConfirm?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(168)
  minCancelNoticeHours?: number;

  @IsOptional()
  @IsBoolean()
  linkedScheduling?: boolean;
}

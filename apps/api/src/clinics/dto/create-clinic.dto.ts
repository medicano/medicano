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

export class CreateClinicDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @Matches(/^\d{14}$/, { message: 'cnpj must be 14 digits' })
  cnpj!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  phone!: string;

  @ValidateNested()
  @Type(() => AddressDto)
  address!: AddressDto;

  @IsArray()
  @IsEnum(Specialty, { each: true })
  @ArrayMinSize(1)
  specialties!: Specialty[];

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @IsEnum(SubscriptionStatus)
  @IsOptional()
  subscriptionStatus?: SubscriptionStatus;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WeeklySlotDto)
  @ArrayMaxSize(50)
  @IsOptional()
  weeklySlots?: WeeklySlotDto[];

  @IsBoolean()
  @IsOptional()
  autoConfirm?: boolean;

  @IsInt()
  @Min(0)
  @Max(168)
  @IsOptional()
  minCancelNoticeHours?: number;

  @IsBoolean()
  @IsOptional()
  linkedScheduling?: boolean;
}

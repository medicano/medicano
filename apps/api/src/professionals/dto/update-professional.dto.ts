import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Specialty } from '../../common/enums/specialty.enum';
import { AddressDto } from '../../common/dto/address.dto';
import { WeeklySlotDto } from '../../common/dto/weekly-slot.dto';

export class UpdateProfessionalDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  bio?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsEnum(Specialty)
  @IsOptional()
  specialty?: Specialty;

  @IsString()
  @IsOptional()
  registration?: string;

  @IsString()
  @Matches(/^\d{11}$/, { message: 'CPF deve ter 11 dígitos' })
  @IsOptional()
  cpf?: string;

  @IsInt()
  @Min(0)
  @Max(168)
  @IsOptional()
  minCancelNoticeHours?: number;

  @ValidateNested()
  @Type(() => AddressDto)
  @IsOptional()
  address?: AddressDto;

  @ValidateNested({ each: true })
  @Type(() => WeeklySlotDto)
  @IsArray()
  @IsOptional()
  weeklySlots?: WeeklySlotDto[];

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  autoConfirm?: boolean;
}

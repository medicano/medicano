import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsMongoId,
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

export class UpdateProfessionalDto {
  @IsMongoId()
  @IsOptional()
  userId?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;

  @IsEnum(Specialty)
  @IsOptional()
  specialty?: Specialty;

  @IsString()
  @Matches(/^\d{11}$/, { message: 'cpf must be 11 digits' })
  @IsOptional()
  cpf?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  registration?: string;

  @ValidateNested()
  @Type(() => AddressDto)
  @IsOptional()
  address?: AddressDto;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

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
}

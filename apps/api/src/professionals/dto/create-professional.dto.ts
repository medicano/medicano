import {
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
import { Type } from 'class-transformer';
import { Specialty } from '../../common/enums/specialty.enum';
import { AddressDto } from '../../common/dto/address.dto';
import { WeeklySlotDto } from '../../common/dto/weekly-slot.dto';

export class CreateProfessionalDto {
  @IsMongoId()
  userId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(Specialty)
  specialty: Specialty;

  @IsString()
  @Matches(/^\d{11}$/, { message: 'cpf must be exactly 11 digits' })
  cpf: string;

  @IsString()
  @IsNotEmpty()
  registration: string;

  @ValidateNested()
  @Type(() => AddressDto)
  address: AddressDto;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => WeeklySlotDto)
  weeklySlots?: WeeklySlotDto[];

  @IsOptional()
  @IsBoolean()
  autoConfirm?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(168)
  minCancelNoticeHours?: number;
}

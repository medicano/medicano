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

export class CreateProfessionalDto {
  @IsMongoId()
  userId!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEnum(Specialty)
  specialty!: Specialty;

  @IsString()
  @Matches(/^\d{11}$/, { message: 'cpf must be 11 digits' })
  cpf!: string;

  @IsString()
  @IsNotEmpty()
  registration!: string;

  @ValidateNested()
  @Type(() => AddressDto)
  address!: AddressDto;

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

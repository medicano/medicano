import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AddressDto } from '../../common/dto/address.dto';
import { Specialty } from '../../common/enums/specialty.enum';

export class UpdateClinicProfileDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  website?: string;

  @IsString()
  @IsOptional()
  hours?: string;

  @IsString()
  @IsOptional()
  addressText?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @Matches(/^[a-zA-Z0-9_-]{3,30}$/, {
    message: 'Use apenas letras, números, hífen ou underscore (3–30 caracteres)',
  })
  @IsOptional()
  customCode?: string;

  @IsBoolean()
  @IsOptional()
  allowConsecutiveAttendants?: boolean;

  @IsBoolean()
  @IsOptional()
  notifyEmail?: boolean;

  @IsBoolean()
  @IsOptional()
  notifySms?: boolean;

  @IsBoolean()
  @IsOptional()
  autoConfirm?: boolean;

  @ValidateNested()
  @Type(() => AddressDto)
  @IsOptional()
  address?: AddressDto;

  @IsArray()
  @IsEnum(Specialty, { each: true })
  @IsOptional()
  specialties?: Specialty[];

  @Matches(/^\d{14}$/, { message: 'CNPJ deve ter 14 dígitos' })
  @IsString()
  @IsOptional()
  readonly cnpj?: string;
}

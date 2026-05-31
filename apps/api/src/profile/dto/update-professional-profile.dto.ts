import {
  IsBoolean,
  IsString,
  IsOptional,
  IsEnum,
  IsEmail,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AddressDto } from '../../common/dto/address.dto';
import { Specialty } from '../../common/enums/specialty.enum';

export class UpdateProfessionalProfileDto {
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
  crm?: string;

  @IsBoolean()
  @IsOptional()
  autoConfirm?: boolean;

  @ValidateNested()
  @Type(() => AddressDto)
  @IsOptional()
  address?: AddressDto;
}

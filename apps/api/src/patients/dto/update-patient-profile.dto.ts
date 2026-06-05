import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Gender } from '../../common/enums/gender.enum';
import { Pronouns } from '../../common/enums/pronouns.enum';
import { Sex } from '../../common/enums/sex.enum';
import { AddressFormDto } from '../../common/dto/address-form.dto';

export class UpdatePatientProfileDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsDateString()
  @IsOptional()
  dateOfBirth?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsEnum(Sex)
  @IsOptional()
  sex?: Sex;

  @IsEnum(Gender)
  @IsOptional()
  gender?: Gender;

  @IsEnum(Pronouns)
  @IsOptional()
  pronouns?: Pronouns;

  @IsString()
  @IsOptional()
  cep?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  state?: string;

  @ValidateNested()
  @Type(() => AddressFormDto)
  @IsOptional()
  addressForm?: AddressFormDto;
}

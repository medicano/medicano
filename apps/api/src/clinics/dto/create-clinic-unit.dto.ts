import { IsArray, IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { AddressFormDto } from '../../common/dto/address-form.dto';
import { WeeklySlotDto } from '../../common/dto/weekly-slot.dto';

export class CreateClinicUnitDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name!: string;

  @ValidateNested()
  @Type(() => AddressFormDto)
  addressForm!: AddressFormDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WeeklySlotDto)
  weeklySlots?: WeeklySlotDto[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

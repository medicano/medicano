import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

import { Specialty } from '../../common/enums/specialty.enum';

export class SearchQueryDto {
  @IsEnum(Specialty)
  @IsOptional()
  specialty?: Specialty;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsIn(['clinic', 'professional', 'all'])
  @IsOptional()
  type?: 'clinic' | 'professional' | 'all';

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  @IsOptional()
  limit?: number;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  userLat?: number;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  userLng?: number;
}

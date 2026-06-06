import { IsString, IsOptional } from 'class-validator';

export class SearchCitiesQueryDto {
  @IsString()
  @IsOptional()
  readonly q?: string;
}

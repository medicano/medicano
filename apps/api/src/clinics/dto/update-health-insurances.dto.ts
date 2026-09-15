import { IsArray, IsString } from 'class-validator';

export class UpdateHealthInsurancesDto {
  @IsArray()
  @IsString({ each: true })
  healthInsurances!: string[];
}

import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateProfessionalDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  specialty?: string;
}

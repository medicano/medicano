import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class RemoveClinicPhotoDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\/uploads\/clinics\//, { message: 'path deve apontar para /uploads/clinics/...' })
  path!: string;
}

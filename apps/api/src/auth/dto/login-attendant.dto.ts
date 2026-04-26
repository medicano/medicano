import { IsMongoId, IsString, MinLength } from 'class-validator';

export class LoginAttendantDto {
  @IsMongoId()
  readonly clinicId: string;

  @IsString()
  readonly username: string;

  @IsString()
  @MinLength(8)
  readonly password: string;
}

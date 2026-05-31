import { IsString, MinLength } from 'class-validator';

export class LoginAttendantDto {
  @IsString()
  @MinLength(1)
  readonly clinicId: string;

  @IsString()
  readonly username: string;

  @IsString()
  @MinLength(8)
  readonly password: string;
}

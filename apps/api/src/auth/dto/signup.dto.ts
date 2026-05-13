import {
  IsEmail,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { Role } from '../../common/enums/role.enum';

export class SignupDto {
  @IsEnum(Role)
  readonly role: Role;

  @IsEmail()
  @IsOptional()
  readonly email?: string;

  @IsString()
  @IsOptional()
  readonly username?: string;

  @IsMongoId()
  @IsOptional()
  readonly clinicId?: string;

  @IsString()
  @MinLength(8)
  readonly password: string;

  @IsString()
  @IsOptional()
  readonly name?: string;
}

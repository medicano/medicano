import { IsArray, IsEnum, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { AttendantPermission } from '../../common/enums/attendant-permission.enum';

export class CreateAttendantDto {
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[a-zA-Z0-9._-]+$/, {
    message:
      'username must contain only letters, numbers, dots, underscores, and hyphens',
  })
  username!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  displayName!: string;

  // RF65 — se omitido, AttendantsService aplica o default (view_agenda + manage_appointments).
  @IsOptional()
  @IsArray()
  @IsEnum(AttendantPermission, { each: true })
  permissions?: AttendantPermission[];
}

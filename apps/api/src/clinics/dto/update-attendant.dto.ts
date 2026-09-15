import { IsArray, IsBoolean, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { AttendantPermission } from '../../common/enums/attendant-permission.enum';

export class UpdateAttendantDto {
  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  // RF65
  @IsOptional()
  @IsArray()
  @IsEnum(AttendantPermission, { each: true })
  permissions?: AttendantPermission[];
}

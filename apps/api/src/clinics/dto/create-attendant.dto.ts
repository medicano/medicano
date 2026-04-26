import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateAttendantDto {
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message:
      'username must contain only letters, numbers, underscores, and hyphens',
  })
  username!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  displayName!: string;
}

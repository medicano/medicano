import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
  Length,
  Matches,
  MinLength,
  ValidateIf,
} from 'class-validator';

import { Gender } from '../../common/enums/gender.enum';
import { Pronouns } from '../../common/enums/pronouns.enum';
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

  @IsDateString()
  @IsOptional()
  readonly dateOfBirth?: string;

  @IsString()
  @Matches(/^\+?\d{10,14}$/, {
    message: 'Telefone deve ter entre 10 e 14 dígitos, pode iniciar com +',
  })
  @ValidateIf((o) => o.role === Role.PATIENT)
  readonly phone?: string;

  @IsEnum(Gender)
  @IsOptional()
  readonly gender?: Gender;

  @IsEnum(Pronouns)
  @IsOptional()
  readonly pronouns?: Pronouns;

  @IsString()
  @Length(8, 8)
  @Matches(/^\d{8}$/, { message: 'CEP deve ter 8 dígitos' })
  @IsOptional()
  readonly cep?: string;

  @IsString()
  @IsOptional()
  readonly city?: string;

  @IsString()
  @Length(2, 2)
  @IsOptional()
  readonly state?: string;

  @IsString()
  @Matches(/^\d{14}$/, { message: 'CNPJ deve ter 14 dígitos' })
  @ValidateIf((o) => o.role === Role.CLINIC)
  readonly cnpj?: string;

  // Endereço da clínica — obrigatório no cadastro para que a clínica tenha
  // coordenadas desde o início e apareça nas buscas por proximidade. Editável
  // depois em "Dados da clínica".
  @IsString()
  @ValidateIf((o) => o.role === Role.CLINIC)
  readonly addressText?: string;

  @IsString()
  @IsOptional()
  readonly regNum?: string;

  @IsString()
  @IsOptional()
  readonly cpf?: string;

  @IsString()
  @IsOptional()
  readonly specialty?: string;
}

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
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

import { Gender } from '../../common/enums/gender.enum';
import { Pronouns } from '../../common/enums/pronouns.enum';
import { Role } from '../../common/enums/role.enum';
import { Specialty } from '../../common/enums/specialty.enum';
import { ProfessionalPlan } from '../../common/enums/professional-plan.enum';
import { AddressFormDto } from '../../common/dto/address-form.dto';

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

  // Endereço estruturado (CEP, número, etc.) preenchido no cadastro de clínica
  // e profissional. O backend deriva addressText/city/coordenadas a partir dele.
  @ValidateNested()
  @Type(() => AddressFormDto)
  @IsOptional()
  readonly addressForm?: AddressFormDto;

  // Compatibilidade: texto de endereço e referência (derivados de addressForm no
  // front, mas ainda aceitos avulsos).
  @IsString()
  @IsOptional()
  readonly addressText?: string;

  @IsString()
  @IsOptional()
  readonly addressReference?: string;

  @IsString()
  @IsOptional()
  readonly regNum?: string;

  @IsString()
  @IsOptional()
  readonly cpf?: string;

  @IsEnum(Specialty)
  @IsOptional()
  readonly specialty?: Specialty;

  // Plano escolhido pelo profissional autônomo no cadastro (opcional; default FREE).
  @IsEnum(ProfessionalPlan)
  @IsOptional()
  readonly plan?: ProfessionalPlan;
}

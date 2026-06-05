import { IsOptional, IsString } from 'class-validator';

// Espelha o AddressForm (schema) / AddressValue (frontend). Tudo opcional —
// a obrigatoriedade (CEP + número) é validada no formulário.
export class AddressFormDto {
  @IsString() @IsOptional() cep?: string;
  @IsString() @IsOptional() street?: string;
  @IsString() @IsOptional() number?: string;
  @IsString() @IsOptional() complement?: string;
  @IsString() @IsOptional() neighborhood?: string;
  @IsString() @IsOptional() city?: string;
  @IsString() @IsOptional() state?: string;
  @IsString() @IsOptional() reference?: string;
}

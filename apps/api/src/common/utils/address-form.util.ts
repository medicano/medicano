import { AddressFormDto } from '../dto/address-form.dto';

// Monta o endereço postal a partir do formulário estruturado. Mesma ordem do
// frontend ("logradouro, número - complemento - bairro, cidade - UF, CEP"); a
// referência fica de fora (dado não-postal que atrapalharia o geocoding).
export function composeAddressText(address: AddressFormDto): string {
  const street = address.number ? `${address.street ?? ''}, ${address.number}` : address.street ?? '';
  const cityState = [address.city, address.state].filter(Boolean).join(' - ');
  return [street, address.complement, address.neighborhood, cityState, address.cep]
    .map((part) => (part ?? '').trim())
    .filter(Boolean)
    .join(' - ');
}

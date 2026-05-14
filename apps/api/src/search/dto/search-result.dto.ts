import { Address } from '../../common/schemas/address.schema';

export interface ProfessionalSearchResult {
  id: string;
  name: string;
  specialty: string;
  address: Address;
}

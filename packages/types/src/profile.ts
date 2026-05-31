export interface UserProfile {
  _id: string;
  name: string;
  email?: string;
  role?: string;
}

export interface ClinicProfile {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  description?: string;
  cnpj?: string;
  autoConfirm?: boolean;
}

export interface ProfessionalProfile {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  bio?: string;
  specialty?: string;
  autoConfirm?: boolean;
}

export interface PatientProfile {
  _id: string;
  name: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  pronouns?: string;
  cep?: string;
  city?: string;
  state?: string;
}

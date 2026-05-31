// Tipos de domínio das respostas da API consumidas pelo frontend.
// Campos opcionais porque cada endpoint/contexto retorna um subconjunto.

export interface Professional {
  id: string;
  _id?: string;
  name?: string;
  specialty?: string;
  email?: string;
  phone?: string;
  bio?: string;
  city?: string;
  address?: string | { city?: string; street?: string; state?: string; number?: string };
  autoConfirm?: boolean;
  userId?: string;
}

export interface Appointment {
  id: string;
  _id?: string;
  status?: string;
  startAt?: string;
  start?: string;
  date?: string;
  dateLabel?: string;
  slot?: string;
  duration?: number;
  durationMinutes?: number;
  notes?: string;
  patientId?: string;
  patientName?: string;
  professional?: Professional;
  professionalId?: string;
  professionalName?: string;
  clinicId?: string;
  clinicName?: string;
  specialty?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Attendant {
  id: string;
  _id?: string;
  name?: string;
  displayName?: string;
  username?: string;
  email?: string;
  active?: boolean;
  isActive?: boolean;
  createdAt?: string;
}

export interface NotificationItem {
  id: string;
  _id?: string;
  title?: string;
  message?: string;
  type?: string;
  read?: boolean;
  readAt?: string | null;
  createdAt?: string;
}

export interface Clinic {
  id: string;
  _id?: string;
  name?: string;
  email?: string;
  phone?: string;
  cnpj?: string;
  website?: string;
  hours?: string;
  addressText?: string;
  city?: string;
  specialties?: string[];
  customCode?: string;
  lat?: number;
  lng?: number;
}

export interface SearchResult {
  id: string;
  _id?: string;
  type?: 'clinic' | 'professional';
  name?: string;
  specialty?: string;
  city?: string;
  address?: string;
  distanceKm?: number;
  rating?: number;
}

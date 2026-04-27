export enum UserRole {
  PATIENT = 'patient',
  CLINIC = 'clinic',
  PROFESSIONAL = 'professional',
  ATTENDANT = 'attendant',
}

export type Specialty =
  | 'medicine'
  | 'psychology'
  | 'psychiatry'
  | 'dentistry'
  | 'nutrition';

export type SubscriptionPlan = 'free' | 'basic' | 'pro';

export interface IAddress {
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
}

export interface IWeeklySlot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
}

export interface IUser {
  _id: string;
  role: UserRole;
  email?: string;
  username?: string;
  clinicId?: string;
  displayName?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IClinic {
  _id: string;
  name: string;
  cnpj: string;
  email: string;
  phone: string;
  address: IAddress;
  specialties: Specialty[];
  description?: string;
  userId?: string;
  subscriptionStatus?: string;
  weeklySlots: IWeeklySlot[];
  autoConfirm: boolean;
  minCancelNoticeHours: number;
  linkedScheduling: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IProfessional {
  _id: string;
  userId: string;
  name: string;
  specialty: Specialty;
  cpf: string;
  registration: string;
  address: IAddress;
  phone?: string;
  description?: string;
  weeklySlots: IWeeklySlot[];
  autoConfirm: boolean;
  minCancelNoticeHours: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISubscription {
  _id: string;
  ownerType: 'clinic' | 'professional';
  ownerId: string;
  plan: SubscriptionPlan;
  status?: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IClinicProfessional {
  clinicId: string;
  professionalId: string;
  isActive: boolean;
}

export interface IAuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface ILoginStandardDto {
  email: string;
  password: string;
}

export interface ILoginAttendantDto {
  username: string;
  password: string;
  clinicId: string;
}

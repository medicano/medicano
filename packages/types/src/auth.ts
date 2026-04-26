/**
 * User roles in the Medicano platform
 */
export enum UserRole {
  PATIENT = 'patient',
  CLINIC = 'clinic',
  PROFESSIONAL = 'professional',
  ATTENDANT = 'attendant',
}

/**
 * Base user interface
 */
export interface IUser {
  id: string;
  role: UserRole;
  email?: string;
  username?: string;
  createdAt: Date;
}

/**
 * Clinic interface
 */
export interface IClinic {
  id: string;
  name: string;
  subscriptionStatus: string;
}

/**
 * Professional interface
 */
export interface IProfessional {
  id: string;
  specialty: string;
  userId: string;
}

/**
 * Clinic-Professional relationship interface
 */
export interface IClinicProfessional {
  clinicId: string;
  professionalId: string;
}

/**
 * Auth tokens response interface
 */
export interface IAuthTokens {
  accessToken: string;
}

/**
 * Standard login DTO interface (for patient, clinic, professional)
 */
export interface ILoginStandardDto {
  email: string;
  password: string;
}

/**
 * Attendant login DTO interface (clinic-scoped login)
 */
export interface ILoginAttendantDto {
  clinicId: string;
  username: string;
  password: string;
}

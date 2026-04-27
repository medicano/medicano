export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken?: string;
  user: AuthUser;
}

export interface AuthUser {
  _id: string;
  email: string;
  role: UserRole;
  name: string;
}

export enum UserRole {
  ADMIN = 'ADMIN',
  CLINIC = 'CLINIC',
  PROFESSIONAL = 'PROFESSIONAL',
  PATIENT = 'PATIENT',
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  role: UserRole;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

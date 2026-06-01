// ─── Enums ───────────────────────────────────────────────────────────────────

export enum BiologicalSex {
  MALE = 'male',
  FEMALE = 'female',
  INTERSEX = 'intersex',
  UNDISCLOSED = 'undisclosed',
}

export enum SmokingStatus {
  NEVER = 'never',
  FORMER = 'former',
  CURRENT = 'current',
}

export enum AlcoholUse {
  NEVER = 'never',
  SOCIAL = 'social',
  REGULAR = 'regular',
}

export enum ActivityLevel {
  SEDENTARY = 'sedentary',
  LIGHT = 'light',
  MODERATE = 'moderate',
  INTENSE = 'intense',
}

export enum LanguageLevel {
  TECHNICAL = 'technical',
  ACCESSIBLE = 'accessible',
}

export enum ImmuneStatus {
  COMPETENT = 'competent',
  SUPPRESSED = 'suppressed',
}

// ─── Sub-interfaces ───────────────────────────────────────────────────────────

export interface IMedication {
  name: string;
  dose?: string;
}

export interface IAllergy {
  substance: string;
  reaction?: string;
}

// ─── Main interface ───────────────────────────────────────────────────────────

export interface IPatientProfile {
  // Identity (server-owned)
  _id: string;
  userId: string;

  // Demographics
  fullName?: string;
  birthDate?: Date;
  biologicalSex?: BiologicalSex;
  preferredName?: string;

  // Anthropometrics
  heightCm?: number;
  weightKg?: number;

  // Reproductive
  isPregnant?: boolean;
  gestationalWeeks?: number;

  // Location
  city?: string;
  state?: string;
  country?: string;

  // Clinical history
  chronicConditions?: string[];
  medications?: IMedication[];
  allergies?: IAllergy[];
  previousSurgeries?: string[];
  familyHistory?: string[];

  // Lifestyle
  smokingStatus?: SmokingStatus;
  alcoholUse?: AlcoholUse;
  activityLevel?: ActivityLevel;

  // Immune & exposure
  immuneStatus?: ImmuneStatus;
  recentTravelCountries?: string[];
  animalExposure?: string[];

  // Contact preference
  languageLevel?: LanguageLevel;

  // Free-text notes provided by the patient (treated only as clinical data).
  observations?: string;

  // Triage opt-in (required — must be set deliberately)
  useInTriage: boolean;

  // Audit timestamps
  lastReviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ─── DTO-style interfaces ─────────────────────────────────────────────────────

export interface IUpdatePatientProfileDto
  extends Partial<Omit<IPatientProfile, '_id' | 'userId' | 'createdAt' | 'updatedAt'>> {}

export interface IPatientProfileExport {
  profile: IPatientProfile | null;
  exportedAt: Date;
}

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import {
  BiologicalSex,
  SmokingStatus,
  AlcoholUse,
  ActivityLevel,
  ImmuneStatus,
  LanguageLevel,
} from '@medicano/types';

@Schema({ _id: false })
class MedicationSubdoc {
  @Prop({ type: String, required: true })
  name!: string;

  @Prop({ type: String })
  dose?: string;
}

@Schema({ _id: false })
class AllergySubdoc {
  @Prop({ type: String, required: true })
  substance!: string;

  @Prop({ type: String })
  reaction?: string;
}

const MedicationSubSchema = SchemaFactory.createForClass(MedicationSubdoc);
const AllergySubSchema = SchemaFactory.createForClass(AllergySubdoc);

@Schema({ timestamps: true })
export class PatientProfile {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true })
  userId!: Types.ObjectId;

  // O assistente só usa o perfil se o paciente optar explicitamente.
  @Prop({ type: Boolean, default: false })
  useInAssistant!: boolean;

  // Demographics
  @Prop({ type: String })
  fullName?: string;

  @Prop({ type: Date })
  birthDate?: Date;

  @Prop({ type: String, enum: BiologicalSex })
  biologicalSex?: BiologicalSex;

  @Prop({ type: String })
  preferredName?: string;

  // Anthropometrics
  @Prop({ type: Number })
  heightCm?: number;

  @Prop({ type: Number })
  weightKg?: number;

  // Reproductive
  @Prop({ type: Boolean })
  isPregnant?: boolean;

  @Prop({ type: Number })
  gestationalWeeks?: number;

  // Location
  @Prop({ type: String })
  city?: string;

  @Prop({ type: String })
  state?: string;

  @Prop({ type: String })
  country?: string;

  // Clinical history
  @Prop({ type: [String], default: [] })
  chronicConditions!: string[];

  @Prop({ type: [MedicationSubSchema], default: [] })
  medications!: MedicationSubdoc[];

  @Prop({ type: [AllergySubSchema], default: [] })
  allergies!: AllergySubdoc[];

  @Prop({ type: [String], default: [] })
  previousSurgeries!: string[];

  @Prop({ type: [String], default: [] })
  familyHistory!: string[];

  // Lifestyle
  @Prop({ type: String, enum: SmokingStatus })
  smokingStatus?: SmokingStatus;

  @Prop({ type: String, enum: AlcoholUse })
  alcoholUse?: AlcoholUse;

  @Prop({ type: String, enum: ActivityLevel })
  activityLevel?: ActivityLevel;

  // Immune & exposure
  @Prop({ type: String, enum: ImmuneStatus })
  immuneStatus?: ImmuneStatus;

  @Prop({ type: [String], default: [] })
  recentTravelCountries!: string[];

  @Prop({ type: [String], default: [] })
  animalExposure!: string[];

  // Contact preference
  @Prop({ type: String, enum: LanguageLevel })
  languageLevel?: LanguageLevel;

  // Free-text notes (tratado apenas como dado clínico no prompt).
  @Prop({ type: String, maxlength: 2000 })
  observations?: string;

  // Audit
  @Prop({ type: Date })
  lastReviewedAt?: Date;
}

export type PatientProfileDocument = HydratedDocument<PatientProfile>;
export const PatientProfileSchema = SchemaFactory.createForClass(PatientProfile);

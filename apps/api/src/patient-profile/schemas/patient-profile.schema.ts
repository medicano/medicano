import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import {
  Gender,
  Sex,
  BloodType,
  PhysicalActivityLevel,
  SmokingStatus,
  AlcoholConsumption,
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
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true,
  })
  userId!: Types.ObjectId;

  @Prop({ type: Boolean, default: true })
  useInTriage!: boolean;

  // Demographics
  @Prop({ type: Date })
  birthDate?: Date;

  @Prop({ type: String, enum: Gender })
  gender?: Gender;

  @Prop({ type: String, enum: Sex })
  sex?: Sex;

  // Biometrics
  @Prop({ type: Number })
  weightKg?: number;

  @Prop({ type: Number })
  heightCm?: number;

  @Prop({ type: String, enum: BloodType })
  bloodType?: BloodType;

  // Lifestyle
  @Prop({ type: String, enum: PhysicalActivityLevel })
  physicalActivityLevel?: PhysicalActivityLevel;

  @Prop({ type: String, enum: SmokingStatus })
  smokingStatus?: SmokingStatus;

  @Prop({ type: Number })
  smokingPackYears?: number;

  @Prop({ type: String, enum: AlcoholConsumption })
  alcoholConsumption?: AlcoholConsumption;

  @Prop({ type: Number })
  sleepHoursPerNight?: number;

  // Medical
  @Prop({ type: [MedicationSubSchema], default: [] })
  medications!: MedicationSubdoc[];

  @Prop({ type: [AllergySubSchema], default: [] })
  allergies!: AllergySubdoc[];

  @Prop({ type: [String], default: [] })
  chronicConditions!: string[];

  @Prop({ type: [String], default: [] })
  familyHistory!: string[];

  @Prop({ type: [String], default: [] })
  dietaryRestrictions!: string[];

  @Prop({ type: String, maxlength: 1000 })
  observations?: string;

  @Prop({ type: Date })
  lastReviewedAt?: Date;
}

export type PatientProfileDocument = HydratedDocument<PatientProfile>;
export const PatientProfileSchema = SchemaFactory.createForClass(PatientProfile);

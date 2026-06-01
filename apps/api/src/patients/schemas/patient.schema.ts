import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Gender } from '../../common/enums/gender.enum';
import { Pronouns } from '../../common/enums/pronouns.enum';
import { Sex } from '../../common/enums/sex.enum';

@Schema({ timestamps: true })
export class Patient {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  userId: Types.ObjectId;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: Date, required: true })
  dateOfBirth: Date;

  @Prop({ type: String })
  phone?: string;

  // Sexo biológico (importante para diagnóstico); opcional.
  @Prop({ type: String, enum: Sex })
  sex?: Sex;

  @Prop({ type: String, enum: Gender })
  gender?: Gender;

  @Prop({ type: String, enum: Pronouns })
  pronouns?: Pronouns;

  @Prop({ type: String })
  cep?: string;

  @Prop({ type: String })
  city?: string;

  @Prop({ type: String })
  state?: string;
}

export type PatientDocument = Patient & Document;

export const PatientSchema = SchemaFactory.createForClass(Patient);

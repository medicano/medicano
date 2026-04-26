import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class ClinicProfessional {
  @Prop({ type: Types.ObjectId, ref: 'Clinic', required: true })
  clinicId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Professional', required: true })
  professionalId: Types.ObjectId;
}

export type ClinicProfessionalDocument = ClinicProfessional & Document;
export const ClinicProfessionalSchema = SchemaFactory.createForClass(ClinicProfessional);

ClinicProfessionalSchema.index({ clinicId: 1, professionalId: 1 }, { unique: true });

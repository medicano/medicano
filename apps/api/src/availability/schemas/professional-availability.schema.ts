import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import {
  WeeklySlot,
  WeeklySlotSchema,
} from '../../common/schemas/weekly-slot.schema';

@Schema({ timestamps: true })
export class ProfessionalAvailability {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Professional', required: true })
  professionalId: Types.ObjectId;

  @Prop({ type: Date, required: true })
  date: Date;

  @Prop({ type: Boolean, default: false })
  isUnavailable: boolean;

  @Prop({ type: [WeeklySlotSchema], default: [] })
  customSlots: WeeklySlot[];
}

export type ProfessionalAvailabilityDocument = ProfessionalAvailability &
  Document;
export const ProfessionalAvailabilitySchema = SchemaFactory.createForClass(
  ProfessionalAvailability,
);

ProfessionalAvailabilitySchema.index(
  { professionalId: 1, date: 1 },
  { unique: true },
);

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { WeeklySlot, WeeklySlotSchema } from '../../common/schemas/weekly-slot.schema';

@Schema({ timestamps: true })
export class Professional {
  @Prop({ type: String, required: true })
  specialty: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  userId: Types.ObjectId;

  @Prop({ type: String })
  name?: string;

  @Prop({ type: String })
  address?: string;

  @Prop({ type: [WeeklySlotSchema], default: [] })
  weeklySlots?: WeeklySlot[];
}

export type ProfessionalDocument = Professional & Document;
export const ProfessionalSchema = SchemaFactory.createForClass(Professional);

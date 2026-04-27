import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Specialty } from '../../common/enums/specialty.enum';
import { Address, AddressSchema } from '../../common/schemas/address.schema';
import { WeeklySlot, WeeklySlotSchema } from '../../common/schemas/weekly-slot.schema';

export type ProfessionalDocument = Professional & Document;

@Schema({ timestamps: true })
export class Professional {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, enum: Specialty })
  specialty: Specialty;

  @Prop({ required: true })
  cpf: string;

  @Prop({ required: true })
  registration: string;

  @Prop({ type: AddressSchema, required: true })
  address: Address;

  @Prop()
  phone?: string;

  @Prop({ maxlength: 1000 })
  description?: string;

  @Prop({ type: [WeeklySlotSchema], default: [] })
  weeklySlots: WeeklySlot[];

  @Prop({ default: false })
  autoConfirm: boolean;

  @Prop({ default: 24, min: 0, max: 168 })
  minCancelNoticeHours: number;
}

export const ProfessionalSchema = SchemaFactory.createForClass(Professional);

ProfessionalSchema.index({ cpf: 1 }, { unique: true });
ProfessionalSchema.index({ 'address.city': 1, specialty: 1 });

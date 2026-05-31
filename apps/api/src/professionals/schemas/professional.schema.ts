import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Address, AddressSchema } from '../../common/schemas/address.schema';
import { WeeklySlot, WeeklySlotSchema } from '../../common/schemas/weekly-slot.schema';
import { Specialty } from '../../common/enums/specialty.enum';

export type ProfessionalDocument = HydratedDocument<Professional>;

@Schema({ timestamps: true })
export class Professional {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String })
  bio?: string;

  @Prop({ type: String })
  phone?: string;

  @Prop({ type: String })
  email?: string;

  @Prop({ type: String, enum: Specialty })
  specialty?: Specialty;

  @Prop({ type: String })
  registration?: string;

  @Prop({ type: String })
  cpf?: string;

  @Prop({ type: Number, default: 24, min: 0, max: 168 })
  minCancelNoticeHours: number;

  @Prop({ type: AddressSchema })
  address?: Address;

  @Prop({ type: [WeeklySlotSchema], default: [] })
  weeklySlots: WeeklySlot[];

  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @Prop({ type: String })
  description?: string;

  @Prop({ type: Boolean, default: false })
  autoConfirm: boolean;
}

export const ProfessionalSchema = SchemaFactory.createForClass(Professional);

ProfessionalSchema.index({ 'address.city': 1, specialty: 1 });

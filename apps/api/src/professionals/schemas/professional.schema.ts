import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { Address, AddressSchema } from '../../common/schemas/address.schema';
import { AddressForm, AddressFormSchema } from '../../common/schemas/address-form.schema';
import { WeeklySlot, WeeklySlotSchema } from '../../common/schemas/weekly-slot.schema';
import { Specialty } from '../../common/enums/specialty.enum';
import { ProfessionalPlan } from '../../common/enums/professional-plan.enum';

export type ProfessionalDocument = HydratedDocument<Professional>;

@Schema({ timestamps: true })
export class Professional {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
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

  // Endereço estruturado do formulário (CEP) — fonte de reidratação no Settings.
  @Prop({ type: AddressFormSchema })
  addressForm?: AddressForm;

  @Prop({ type: [WeeklySlotSchema], default: [] })
  weeklySlots: WeeklySlot[];

  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @Prop({ type: String })
  description?: string;

  @Prop({ type: Boolean, default: false })
  autoConfirm: boolean;

  @Prop({ type: String, enum: ProfessionalPlan, default: ProfessionalPlan.FREE })
  plan: ProfessionalPlan;
}

export const ProfessionalSchema = SchemaFactory.createForClass(Professional);

ProfessionalSchema.index({ 'address.city': 1, specialty: 1 });

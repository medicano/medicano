import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

import { Specialty } from '../../common/enums/specialty.enum';
import { Address, AddressSchema } from '../../common/schemas/address.schema';
import { WeeklySlot, WeeklySlotSchema } from '../../common/schemas/weekly-slot.schema';

export enum SubscriptionStatus {
  TRIAL = 'trial',
  ACTIVE = 'active',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}

export type ClinicDocument = HydratedDocument<Clinic>;

@Schema({ timestamps: true })
export class Clinic {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, trim: true })
  cnpj: string;

  @Prop({ required: true, trim: true, lowercase: true })
  email: string;

  @Prop({ required: true, trim: true })
  phone: string;

  @Prop({ type: AddressSchema, required: true })
  address: Address;

  @Prop({
    type: [String],
    enum: Object.values(Specialty),
    required: true,
  })
  specialties: Specialty[];

  @Prop({ trim: true, maxlength: 1000 })
  description?: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  userId?: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(SubscriptionStatus),
    default: SubscriptionStatus.TRIAL,
  })
  subscriptionStatus?: SubscriptionStatus;

  @Prop({ type: [WeeklySlotSchema], default: [] })
  weeklySlots: WeeklySlot[];

  @Prop({ type: Boolean, default: false })
  autoConfirm: boolean;

  @Prop({ type: Number, default: 24, min: 0, max: 168 })
  minCancelNoticeHours: number;

  @Prop({ type: Boolean, default: false })
  linkedScheduling: boolean;

  createdAt?: Date;
  updatedAt?: Date;
}

export const ClinicSchema: MongooseSchema<Clinic> = SchemaFactory.createForClass(Clinic);

ClinicSchema.index({ userId: 1 }, { sparse: true });
ClinicSchema.index({ cnpj: 1 }, { unique: true });
ClinicSchema.index({ 'address.city': 1, specialties: 1 });

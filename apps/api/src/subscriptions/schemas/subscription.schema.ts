import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum SubscriptionPlan {
  FREE = 'free',
  BASIC = 'basic',
  PRO = 'pro',
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}

export const PLAN_PROFESSIONAL_LIMITS: Record<SubscriptionPlan, number> = {
  [SubscriptionPlan.FREE]: 2,
  [SubscriptionPlan.BASIC]: 10,
  [SubscriptionPlan.PRO]: -1, // -1 = unlimited
};

export type SubscriptionDocument = Subscription & Document;

@Schema({ timestamps: true })
export class Subscription {
  @Prop({ required: true, enum: ['clinic', 'professional'] })
  ownerType: 'clinic' | 'professional';

  @Prop({ required: true, type: Types.ObjectId })
  ownerId: Types.ObjectId;

  @Prop({ type: Types.ObjectId })
  clinicId?: Types.ObjectId;

  @Prop({ required: true, type: String })
  plan: string;

  @Prop({
    required: true,
    type: String,
    enum: Object.values(SubscriptionStatus),
    default: SubscriptionStatus.ACTIVE,
  })
  status: SubscriptionStatus;

  @Prop({ type: Date })
  expiresAt?: Date;
}

export const SubscriptionSchema = SchemaFactory.createForClass(Subscription);

SubscriptionSchema.index({ ownerType: 1, ownerId: 1 }, { unique: true });

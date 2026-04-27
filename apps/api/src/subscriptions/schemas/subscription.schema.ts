import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type SubscriptionOwnerType = 'clinic' | 'professional';

export enum SubscriptionPlan {
  BASIC = 'basic',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise',
}

export const PLAN_PROFESSIONAL_LIMITS: Record<SubscriptionPlan, number> = {
  [SubscriptionPlan.BASIC]: 1,
  [SubscriptionPlan.PROFESSIONAL]: 5,
  [SubscriptionPlan.ENTERPRISE]: Infinity,
};

export type SubscriptionDocument = HydratedDocument<Subscription>;

@Schema({ timestamps: true })
export class Subscription {
  @Prop({ required: true, enum: ['clinic', 'professional'] })
  ownerType: SubscriptionOwnerType;

  @Prop({ required: true, type: Types.ObjectId })
  ownerId: Types.ObjectId;

  /**
   * @deprecated Use `ownerId` + `ownerType` instead.
   * Retained for backward compatibility with historical documents only.
   */
  @Prop({ required: false, type: Types.ObjectId, ref: 'Clinic' })
  clinicId?: Types.ObjectId;

  @Prop({ required: true })
  plan: string;

  @Prop({ type: String })
  status?: string;

  @Prop({ required: true })
  expiresAt: Date;
}

export const SubscriptionSchema = SchemaFactory.createForClass(Subscription);

SubscriptionSchema.index({ ownerType: 1, ownerId: 1 }, { unique: true });

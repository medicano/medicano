import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import {
  SubscriptionPlan,
  SubscriptionStatus,
} from '../constants/subscription.constants';

export type SubscriptionDocument = Subscription & Document;

@Schema({ timestamps: true })
export class Subscription {
  @Prop({ type: Types.ObjectId, ref: 'Clinic', required: true, unique: true })
  clinicId: Types.ObjectId;

  @Prop({ type: String, enum: SubscriptionPlan, default: SubscriptionPlan.FREE })
  plan: SubscriptionPlan;

  @Prop({
    type: String,
    enum: SubscriptionStatus,
    default: SubscriptionStatus.TRIAL,
  })
  status: SubscriptionStatus;

  @Prop({ type: Date })
  expiresAt?: Date;
}

export const SubscriptionSchema = SchemaFactory.createForClass(Subscription);

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { SubscriptionPlan } from '../constants/subscription.constants';

export type SubscriptionDocument = Subscription & Document;

@Schema({ timestamps: true })
export class Subscription {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: String, enum: SubscriptionPlan, required: true })
  plan: SubscriptionPlan;

  @Prop({ type: Number, required: true })
  clinicLimit: number;

  @Prop({ type: Number, required: true })
  appointmentLimit: number;

  @Prop({ type: Boolean, default: false })
  aiTriageEnabled: boolean;

  @Prop({ type: Boolean, default: false })
  prioritySupport: boolean;

  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @Prop({ type: Date })
  expiresAt?: Date;
}

export const SubscriptionSchema = SchemaFactory.createForClass(Subscription);

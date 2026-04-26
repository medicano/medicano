import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SubscriptionDocument = Subscription & Document;

@Schema({ timestamps: true })
export class Subscription {
  @Prop({ type: String, enum: ['clinic', 'professional'], required: true })
  ownerType: 'clinic' | 'professional';

  @Prop({ type: Types.ObjectId, required: true })
  ownerId: Types.ObjectId;

  /**
   * @deprecated Use ownerType='clinic' and ownerId instead.
   * Retained for backward compatibility.
   */
  @Prop({ type: Types.ObjectId, ref: 'Clinic' })
  clinicId?: Types.ObjectId;

  @Prop({ type: String, required: true })
  plan: string;

  @Prop({ type: Date, required: true })
  expiresAt: Date;
}

export const SubscriptionSchema = SchemaFactory.createForClass(Subscription);

SubscriptionSchema.index({ ownerType: 1, ownerId: 1 }, { unique: true });

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

export type UserRole = 'super_admin' | 'clinic_admin' | 'doctor' | 'staff' | 'patient';

@Schema({ timestamps: true })
export class User {
  @Prop({ type: String, required: true, enum: ['super_admin', 'clinic_admin', 'doctor', 'staff', 'patient'] })
  role: UserRole;

  @Prop({ type: String, required: true, lowercase: true, trim: true })
  email: string;

  @Prop({ type: String, required: true, trim: true })
  username: string;

  @Prop({ type: Types.ObjectId, ref: 'Clinic', required: false, default: null })
  clinicId: Types.ObjectId | null;

  @Prop({ type: String, required: true })
  passwordHash: string;

  @Prop({ type: String })
  displayName?: string;

  @Prop({ type: Boolean, default: true })
  isActive: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index({ role: 1, email: 1 }, { unique: true });
UserSchema.index({ clinicId: 1, username: 1 }, { unique: true });

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Role } from '../../common/enums/role.enum';

@Schema({ timestamps: true })
export class User {
  @Prop({ type: String, enum: Role, required: true, immutable: true })
  role: Role;

  @Prop({ type: String, unique: true, sparse: true })
  email?: string;

  @Prop({ type: String, unique: true, sparse: true })
  username?: string;

  @Prop({ type: Types.ObjectId, ref: 'Clinic', sparse: true })
  clinicId?: Types.ObjectId;

  @Prop({ type: String, required: true, select: false })
  passwordHash: string;
}

export type UserDocument = User & Document;
export const UserSchema = SchemaFactory.createForClass(User);

// Compound sparse indexes
UserSchema.index({ role: 1, email: 1 }, { unique: true, sparse: true });
UserSchema.index({ clinicId: 1, username: 1 }, { unique: true, sparse: true });

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Role } from '../../common/enums/role.enum';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true, collection: 'users' })
export class User {
  @Prop({ type: String, enum: Role, required: true })
  role: Role;

  @Prop({ type: String })
  email?: string;

  @Prop({ type: String })
  username?: string;

  @Prop({ type: Types.ObjectId, ref: 'Clinic' })
  clinicId?: Types.ObjectId;

  @Prop({ type: String, required: true })
  passwordHash: string;

  @Prop({ type: String })
  displayName?: string;

  @Prop({ type: Boolean, default: true })
  isActive: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index({ role: 1, email: 1 }, { sparse: true, unique: true });
UserSchema.index({ clinicId: 1, username: 1 }, { sparse: true, unique: true });

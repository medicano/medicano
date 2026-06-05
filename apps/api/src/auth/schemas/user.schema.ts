import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { Role } from '../../common/enums/role.enum';

export interface UserMethods {
  comparePassword(password: string): Promise<boolean>;
}

export type UserDocument = HydratedDocument<User, UserMethods>;

@Schema({ timestamps: true, collection: 'users' })
export class User {
  @Prop({ type: String, enum: Role, required: true })
  role: Role;

  @Prop({ type: String })
  email?: string;

  @Prop({ type: String })
  username?: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Clinic' })
  clinicId?: Types.ObjectId;

  // Atendente pode ser dono por uma clínica (clinicId) OU por um profissional
  // autônomo (professionalId). Exatamente um é preenchido.
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Professional' })
  professionalId?: Types.ObjectId;

  @Prop({ type: String, required: true })
  passwordHash: string;

  @Prop({ type: String })
  displayName?: string;

  @Prop({ type: Boolean, default: true })
  isActive: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.methods.comparePassword = async function (
  password: string,
): Promise<boolean> {
  return bcrypt.compare(password, this.passwordHash);
};

UserSchema.index({ email: 1 }, { sparse: true, unique: true });
UserSchema.index({ clinicId: 1, username: 1 }, { sparse: true, unique: true });
UserSchema.index({ professionalId: 1, username: 1 }, { sparse: true, unique: true });

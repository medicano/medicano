import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Address, AddressSchema } from '../../common/schemas/address.schema';
import { Specialty } from '../../common/enums/specialty.enum';

export type ProfessionalDocument = Professional & Document;

@Schema({ timestamps: true })
export class Professional {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: false })
  bio?: string;

  @Prop({ type: String, required: false })
  phone?: string;

  @Prop({ type: String, required: false })
  email?: string;

  @Prop({ type: String, enum: Specialty, required: true })
  specialty: Specialty;

  @Prop({ type: String, required: false })
  crm?: string;

  @Prop({ type: AddressSchema, required: true })
  address: Address;

  @Prop({ type: Boolean, default: true })
  isActive: boolean;
}

export const ProfessionalSchema = SchemaFactory.createForClass(Professional);

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Address, AddressSchema } from '../../common/schemas/address.schema';
import { Specialty } from '../../common/enums/specialty.enum';

export type ClinicDocument = Clinic & Document;

@Schema({ timestamps: true })
export class Clinic {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: false })
  description?: string;

  @Prop({ type: String, required: false })
  phone?: string;

  @Prop({ type: String, required: false })
  email?: string;

  @Prop({ type: AddressSchema, required: true })
  address: Address;

  @Prop({ type: [String], enum: Specialty, default: [] })
  specialties: Specialty[];

  @Prop({ type: Boolean, default: true })
  isActive: boolean;
}

export const ClinicSchema = SchemaFactory.createForClass(Clinic);

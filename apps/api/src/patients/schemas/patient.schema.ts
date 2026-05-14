import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import {
  Address,
  AddressSchema,
} from '../../common/schemas/address.schema';

@Schema({ timestamps: true })
export class Patient {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  })
  userId: Types.ObjectId;

  @Prop({
    type: String,
    required: true,
  })
  name: string;

  @Prop({
    type: Date,
    required: true,
  })
  dateOfBirth: Date;

  @Prop({
    type: String,
  })
  phone?: string;

  @Prop({
    type: AddressSchema,
  })
  address?: Address;
}

export type PatientDocument = Patient & Document;

export const PatientSchema = SchemaFactory.createForClass(Patient);


import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ _id: false })
export class Address {
  @Prop({ type: String, required: true })
  street: string;

  @Prop({ type: String, required: true })
  number: string;

  @Prop({ type: String, required: false })
  complement?: string;

  @Prop({ type: String, required: true })
  neighborhood: string;

  @Prop({ type: String, required: true })
  city: string;

  @Prop({ type: String, required: true })
  state: string;

  @Prop({ type: String, required: true })
  zipCode: string;

  @Prop({ type: String, required: true, default: 'BR' })
  country: string;
}

export const AddressSchema = SchemaFactory.createForClass(Address);

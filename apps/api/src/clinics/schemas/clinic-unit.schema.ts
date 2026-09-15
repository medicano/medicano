import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { WeeklySlot, WeeklySlotSchema } from '../../common/schemas/weekly-slot.schema';
import { AddressForm, AddressFormSchema } from '../../common/schemas/address-form.schema';

// Uma unidade de atendimento de uma clínica com múltiplos endereços (RF62).
// Mantém _id (diferente de Address/WeeklySlot, que são _id:false) porque cada
// unidade precisa ser referenciável individualmente para update/remoção.
@Schema({ timestamps: true })
export class ClinicUnit {
  _id: Types.ObjectId;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: AddressFormSchema, required: true })
  addressForm: AddressForm;

  @Prop({ type: String })
  addressText?: string;

  @Prop({ type: Number })
  lat?: number;

  @Prop({ type: Number })
  lng?: number;

  // Horário de funcionamento próprio da unidade — independente do
  // weeklySlots geral da clínica em ClinicSchema.
  @Prop({ type: [WeeklySlotSchema], default: [] })
  weeklySlots: WeeklySlot[];

  @Prop({ type: Boolean, default: true })
  isActive: boolean;
}

export type ClinicUnitDocument = ClinicUnit & Document;
export const ClinicUnitSchema = SchemaFactory.createForClass(ClinicUnit);

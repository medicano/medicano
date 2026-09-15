import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { WeeklySlot, WeeklySlotSchema } from '../../common/schemas/weekly-slot.schema';
import { AddressForm, AddressFormSchema } from '../../common/schemas/address-form.schema';
import { ClinicUnit, ClinicUnitSchema } from './clinic-unit.schema';

export type ClinicDocument = Clinic & Document;

@Schema({ timestamps: true })
export class Clinic {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String })
  description?: string;

  @Prop({ type: String })
  city?: string;

  @Prop({ type: String })
  phone?: string;

  @Prop({ type: String })
  email?: string;

  @Prop({ type: Object })
  address?: Record<string, unknown>;

  @Prop({ type: [String], default: [] })
  specialties: string[];

  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @Prop({ type: Boolean, default: false })
  linkedScheduling: boolean;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: String, unique: true, sparse: true, match: /^\d{14}$/ })
  cnpj?: string;

  @Prop({ type: String })
  website?: string;

  @Prop({ type: String })
  hours?: string;

  @Prop({ type: String })
  addressText?: string;

  // Ponto de referência informado no cadastro — dado não-postal, mantido fora
  // do addressText para não interferir no geocoding.
  @Prop({ type: String })
  addressReference?: string;

  // Endereço estruturado (CEP, número, etc.) — fonte para reidratar o formulário
  // no Settings. addressText/city/lat/lng continuam derivados daqui.
  @Prop({ type: AddressFormSchema })
  addressForm?: AddressForm;

  @Prop({ type: Number })
  lat?: number;

  @Prop({ type: Number })
  lng?: number;

  @Prop({ type: String, unique: true, sparse: true })
  customCode?: string;

  @Prop({ type: Boolean, default: false })
  allowConsecutiveAttendants: boolean;

  @Prop({ type: Boolean, default: true })
  notifyEmail: boolean;

  @Prop({ type: Boolean, default: false })
  notifySms: boolean;

  @Prop({ type: Boolean, default: false })
  autoConfirm: boolean;

  @Prop({ type: Number, default: 24, min: 0, max: 168 })
  minCancelNoticeHours: number;

  @Prop({ type: [WeeklySlotSchema], default: [] })
  weeklySlots: WeeklySlot[];

  // RF47 — caminhos relativos (ex.: /uploads/clinics/<id>/<arquivo>.jpg),
  // geridos via ClinicPhotosController. Nunca setados diretamente pelo DTO de
  // create/update — só a rota de upload escreve aqui.
  @Prop({ type: [String], default: [] })
  photos: string[];

  // RF49 — convênios aceitos, texto livre (ex.: "Unimed", "Bradesco Saúde").
  @Prop({ type: [String], default: [] })
  healthInsurances: string[];

  // RF62 — unidades de atendimento para clínicas com múltiplos endereços.
  // Vazio para clínicas de endereço único (o campo `address`/`addressForm`
  // acima continua sendo o endereço "principal" nesse caso).
  @Prop({ type: [ClinicUnitSchema], default: [] })
  units: ClinicUnit[];
}

export const ClinicSchema = SchemaFactory.createForClass(Clinic);

// One clinic per user. Guards against duplicate Clinic documents for the same
// owner, which would split a clinic's subscription and professional links across
// two records and make professionals vanish from patient search. Existing
// duplicates were consolidated by a one-time repair script (see git history).
ClinicSchema.index({ userId: 1 }, { unique: true });


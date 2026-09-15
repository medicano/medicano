import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { ActivityAction } from '../enums/activity-action.enum';

export type ActivityLogDocument = HydratedDocument<ActivityLog>;

// Um registro por ação. Exatamente um entre clinicId/professionalId é
// preenchido — o mesmo modelo de "dono" usado em AttendantsService (clínica
// ou profissional autônomo).
@Schema({ timestamps: true })
export class ActivityLog {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Clinic', index: true })
  clinicId?: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Professional', index: true })
  professionalId?: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  actorUserId: Types.ObjectId;

  @Prop({ type: String, required: true })
  actorDisplayName: string;

  @Prop({ type: String, enum: ActivityAction, required: true })
  action: ActivityAction;

  // Descrição já pronta para exibição — evita lógica de formatação no frontend.
  @Prop({ type: String, required: true })
  description: string;
}

export const ActivityLogSchema = SchemaFactory.createForClass(ActivityLog);

ActivityLogSchema.index({ clinicId: 1, createdAt: -1 });
ActivityLogSchema.index({ professionalId: 1, createdAt: -1 });

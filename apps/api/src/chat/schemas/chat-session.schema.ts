import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { Specialty } from '../../common/enums/specialty.enum';
import { ChatSessionType } from '../enums/chat-session-type.enum';

@Schema({ timestamps: true })
export class ChatSession {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  patient: Types.ObjectId;

  @Prop({ type: String, enum: ChatSessionType, required: true })
  type: ChatSessionType;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Clinic' })
  clinicId?: Types.ObjectId;

  @Prop({ type: String, enum: Specialty })
  recommendedSpecialty?: Specialty;

  @Prop({ type: Boolean, default: false })
  disclaimerShown: boolean;
}

export type ChatSessionDocument = ChatSession & Document;
export const ChatSessionSchema = SchemaFactory.createForClass(ChatSession);

ChatSessionSchema.index({ patient: 1, createdAt: -1 });

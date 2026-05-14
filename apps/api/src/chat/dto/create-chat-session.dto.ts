import { IsEnum, IsMongoId, IsOptional } from 'class-validator';
import { ChatSessionType } from '../enums/chat-session-type.enum';

export class CreateChatSessionDto {
  @IsEnum(ChatSessionType)
  readonly type: ChatSessionType;

  @IsOptional()
  @IsMongoId()
  readonly clinicId?: string;
}

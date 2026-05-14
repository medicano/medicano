import { ChatMessageDocument } from '../schemas/chat-message.schema';
import { Specialty } from '../../common/enums/specialty.enum';

export interface RecommendationDto {
  specialty: Specialty;
}

export interface SendMessageResponse {
  message: ChatMessageDocument;
  recommendation: RecommendationDto | null;
}

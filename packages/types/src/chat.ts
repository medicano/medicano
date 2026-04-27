export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system',
}

export interface ChatMessage {
  role: MessageRole;
  content: string;
  timestamp?: Date;
}

export interface ChatSession {
  _id: string;
  userId: string;
  messages: ChatMessage[];
  triageCompleted: boolean;
  recommendedSpecialty?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SendMessageRequest {
  message: string;
  sessionId?: string;
}

export interface SendMessageResponse {
  sessionId: string;
  message: ChatMessage;
  triageCompleted?: boolean;
  recommendedSpecialty?: string;
}

export interface TriageResult {
  specialty: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  reasoning: string;
}

import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
import { streamText, type LanguageModel } from 'ai';

import { Specialty } from '../common/enums/specialty.enum';
import { ANTHROPIC_MODEL } from './chat.module';
import { TRIAGE_SYSTEM_PROMPT } from './constants/triage-prompt';
import { CreateChatMessageDto } from './dto/create-chat-message.dto';
import { RecommendationDto } from './dto/send-message-response.dto';
import { ChatMessage, ChatMessageDocument } from './schemas/chat-message.schema';
import { ChatSession, ChatSessionDocument } from './schemas/chat-session.schema';

const MAX_CONTEXT_MESSAGES = 20;
const MAX_RESPONSE_TOKENS = 1024;

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(ChatSession.name) private readonly sessionModel: Model<ChatSessionDocument>,
    @InjectModel(ChatMessage.name) private readonly messageModel: Model<ChatMessageDocument>,
    @Inject(ANTHROPIC_MODEL) private readonly model: LanguageModel,
  ) {}

  async createSession(): Promise<ChatSessionDocument> {
    return this.sessionModel.create({});
  }

  async listSessions(): Promise<ChatSessionDocument[]> {
    return this.sessionModel.find().sort({ createdAt: -1 }).exec();
  }

  async listMessages(sessionId: string): Promise<ChatMessageDocument[]> {
    await this.findSessionById(sessionId);
    return this.messageModel.find({ sessionId }).sort({ createdAt: 1 }).exec();
  }

  async findSessionById(sessionId: string): Promise<ChatSessionDocument> {
    if (!isValidObjectId(sessionId)) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }
    const session = await this.sessionModel.findById(sessionId).exec();
    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }
    return session;
  }

  async sendMessage(sessionId: string, dto: CreateChatMessageDto): Promise<Response> {
    const session = await this.findSessionById(sessionId);

    if (session.recommendedSpecialty) {
      throw new ConflictException('Triage already completed for this session');
    }

    const previousMessages = await this.messageModel
      .find({ sessionId })
      .sort({ createdAt: 1 })
      .limit(MAX_CONTEXT_MESSAGES)
      .exec();

    const isFirstMessage = previousMessages.length === 0;

    await this.messageModel.create({
      sessionId,
      role: 'user',
      content: dto.content,
    });

    const llmMessages = [
      ...previousMessages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user' as const, content: dto.content },
    ];

    const result = streamText({
      model: this.model,
      system: TRIAGE_SYSTEM_PROMPT,
      messages: llmMessages,
      maxTokens: MAX_RESPONSE_TOKENS,
      onFinish: async ({ text }: { text: string }) => {
        const recommendation = this.parseRecommendation(text);

        await this.messageModel.create({
          sessionId,
          role: 'assistant',
          content: text,
        });

        if (recommendation) {
          session.recommendedSpecialty = recommendation.specialty;
        }
        if (isFirstMessage) {
          session.disclaimerShown = true;
        }
        if (recommendation || isFirstMessage) {
          await session.save();
        }
      },
    });

    return result.toDataStreamResponse();
  }

  parseRecommendation(text: string): RecommendationDto | null {
    const specialtyValues = Object.values(Specialty);
    const pattern = /\[RECOMMENDATION:\s*([^\]]+)\]/i;
    const match = pattern.exec(text);

    if (!match) {
      return null;
    }

    const extracted = match[1].trim().toUpperCase();
    const matched = specialtyValues.find(
      (s) => s.toUpperCase() === extracted,
    );

    if (!matched) {
      return null;
    }

    return { specialty: matched };
  }
}

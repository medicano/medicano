import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { generateText, type CoreMessage } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

import {
  ChatSession,
  ChatSessionDocument,
} from './schemas/chat-session.schema';
import {
  ChatMessage,
  ChatMessageDocument,
} from './schemas/chat-message.schema';
import { CreateChatMessageDto } from './dto/create-chat-message.dto';
import {
  SendMessageResponse,
  RecommendationDto,
} from './dto/send-message-response.dto';
import { TRIAGE_SYSTEM_PROMPT } from './constants/triage-prompt';
import { Specialty } from '../common/enums/specialty.enum';

const LLM_MODEL = 'claude-sonnet-4-6';
const MAX_CONTEXT_MESSAGES = 20;
const MAX_RESPONSE_TOKENS = 1024;

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @InjectModel(ChatSession.name)
    private readonly sessionModel: Model<ChatSessionDocument>,
    @InjectModel(ChatMessage.name)
    private readonly messageModel: Model<ChatMessageDocument>,
  ) {}

  async createSession(dto: {
    clinicId?: string;
    userId: string;
  }): Promise<ChatSessionDocument> {
    return this.sessionModel.create({
      userId: new Types.ObjectId(dto.userId),
      ...(dto.clinicId && { clinicId: new Types.ObjectId(dto.clinicId) }),
    });
  }

  async listSessions(userId: string): Promise<ChatSessionDocument[]> {
    return this.sessionModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ updatedAt: -1 })
      .exec();
  }

  async sendMessage(
    sessionId: string,
    dto: CreateChatMessageDto,
  ): Promise<SendMessageResponse> {
    const session = await this.findSessionById(sessionId);

    if (session.recommendedSpecialty) {
      throw new ConflictException(
        'This triage session has already been completed. Start a new session for a new triage.',
      );
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

    const llmMessages: CoreMessage[] = [
      ...previousMessages.map((message) => ({
        role: message.role as 'user' | 'assistant',
        content: message.content,
      })),
      { role: 'user', content: dto.content },
    ];

    const llmResponse = await generateText({
      model: anthropic(LLM_MODEL),
      maxTokens: MAX_RESPONSE_TOKENS,
      system: TRIAGE_SYSTEM_PROMPT,
      messages: llmMessages,
    });

    const assistantContent = llmResponse.text ?? '';

    const recommendation = this.parseRecommendation(assistantContent);

    const savedMessage = await this.messageModel.create({
      sessionId,
      role: 'assistant',
      content: assistantContent,
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

    return { message: savedMessage, recommendation };
  }

  async listMessages(sessionId: string): Promise<ChatMessageDocument[]> {
    await this.findSessionById(sessionId);
    return this.messageModel
      .find({ sessionId })
      .sort({ createdAt: 1 })
      .exec();
  }

  parseRecommendation(content: string): RecommendationDto | null {
    if (!content) return null;

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    try {
      const parsed = JSON.parse(jsonMatch[0]) as {
        recommendation?: string;
        reasoning?: string;
      };

      if (!parsed.recommendation || !parsed.reasoning) return null;

      const validSpecialties = Object.values(Specialty) as string[];
      if (!validSpecialties.includes(parsed.recommendation)) return null;

      return {
        specialty: parsed.recommendation as Specialty,
        reasoning: parsed.reasoning,
      };
    } catch (err) {
      this.logger.debug(`Failed to parse recommendation JSON: ${String(err)}`);
      return null;
    }
  }

  private async findSessionById(sessionId: string): Promise<ChatSessionDocument> {
    const session = await this.sessionModel.findById(sessionId).exec();
    if (!session) {
      throw new NotFoundException('Chat session not found');
    }
    return session;
  }
}

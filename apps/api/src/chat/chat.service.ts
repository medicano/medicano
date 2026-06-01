import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ChatSession, ChatSessionDocument } from './schemas/chat-session.schema';
import { ChatMessage, ChatMessageDocument } from './schemas/chat-message.schema';
import { CreateChatSessionDto } from './dto/create-chat-session.dto';
import { CreateChatMessageDto } from './dto/create-chat-message.dto';
import { SendMessageResponseDto } from './dto/send-message-response.dto';
import { ChatSessionType } from './enums/chat-session-type.enum';
import { TRIAGE_SYSTEM_PROMPT } from './constants/triage-prompt';
import { PatientProfileService } from '../patient-profile/patient-profile.service';
import {
  buildPatientContext,
  PATIENT_CONTEXT_SYSTEM_INSTRUCTION,
} from '../patient-profile/utils/build-patient-context';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @InjectModel(ChatSession.name)
    private readonly chatSessionModel: Model<ChatSessionDocument>,
    @InjectModel(ChatMessage.name)
    private readonly chatMessageModel: Model<ChatMessageDocument>,
    private readonly patientProfileService: PatientProfileService,
  ) {}

  async createSession(
    userId: string,
    dto: CreateChatSessionDto,
  ): Promise<ChatSessionDocument> {
    const session = await this.chatSessionModel.create({
      userId,
      type: dto.type,
      title: dto.title ?? null,
    });
    return session;
  }

  async sendMessage(
    userId: string,
    sessionId: string,
    dto: CreateChatMessageDto,
  ): Promise<SendMessageResponseDto> {
    const session = await this.chatSessionModel.findOne({
      _id: new Types.ObjectId(sessionId),
      userId,
    });

    if (!session) {
      throw new NotFoundException('Chat session not found');
    }

    await this.chatMessageModel.create({
      sessionId: session._id,
      role: 'user',
      content: dto.content,
    });

    const systemPrompt = await this.buildSystemPrompt(session);

    const history = await this.chatMessageModel
      .find({ sessionId: session._id })
      .sort({ createdAt: 1 })
      .lean();

    const messages = history.map((msg) => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content,
    }));

    const assistantContent = await this.callLlm(systemPrompt, messages);

    const assistantMessage = await this.chatMessageModel.create({
      sessionId: session._id,
      role: 'assistant',
      content: assistantContent,
    });

    return {
      id: (assistantMessage._id as Types.ObjectId).toHexString(),
      role: 'assistant',
      content: assistantContent,
      createdAt: assistantMessage.createdAt,
    };
  }

  async getMessages(
    userId: string,
    sessionId: string,
  ): Promise<ChatMessageDocument[]> {
    const session = await this.chatSessionModel.findOne({
      _id: new Types.ObjectId(sessionId),
      userId,
    });

    if (!session) {
      throw new NotFoundException('Chat session not found');
    }

    return this.chatMessageModel
      .find({ sessionId: session._id })
      .sort({ createdAt: 1 });
  }

  private async buildSystemPrompt(session: ChatSessionDocument): Promise<string> {
    if (session.type !== ChatSessionType.TRIAGE) {
      return TRIAGE_SYSTEM_PROMPT;
    }

    let systemPrompt = TRIAGE_SYSTEM_PROMPT;

    const profile = await this.patientProfileService.findByUserId(
      session.userId,
    );
    const patientContext = buildPatientContext(profile);

    if (patientContext && patientContext.length > 0) {
      systemPrompt =
        systemPrompt +
        '\n\n' +
        PATIENT_CONTEXT_SYSTEM_INSTRUCTION +
        '\n\n' +
        patientContext;
    }

    return systemPrompt;
  }

  private async callLlm(
    systemPrompt: string,
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
  ): Promise<string> {
    // LLM integration placeholder — actual implementation depends on the LLM
    // provider client already wired in the project (e.g. OpenAI, Anthropic).
    // This method is intentionally kept as a seam for the existing LLM call
    // so that the patient-context injection patch does not alter the invocation
    // contract: systemPrompt is fully assembled before reaching this point.
    void systemPrompt;
    void messages;
    return '';
  }
}

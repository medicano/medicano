import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { streamText, type LanguageModel } from 'ai';

import { ChatSession, ChatSessionDocument } from './schemas/chat-session.schema';
import { ChatMessage, ChatMessageDocument } from './schemas/chat-message.schema';
import { CreateChatMessageDto } from './dto/create-chat-message.dto';
import { CreateChatSessionDto } from './dto/create-chat-session.dto';
import { buildTriageSystemPrompt } from './constants/triage-prompt';
import { Specialty } from '../common/enums/specialty.enum';
import { ANTHROPIC_MODEL } from './constants/chat.tokens';
import { Patient, PatientDocument } from '../patients/schemas/patient.schema';
import { PatientProfileService } from '../patient-profile/patient-profile.service';
import {
  buildPatientContext,
  PATIENT_CONTEXT_SYSTEM_INSTRUCTION,
} from '../patient-profile/utils/build-patient-context';
import type { IPatientProfile } from '@medicano/types';

const MAX_RESPONSE_TOKENS = 1024;

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(ChatSession.name) private readonly sessionModel: Model<ChatSessionDocument>,
    @InjectModel(ChatMessage.name) private readonly messageModel: Model<ChatMessageDocument>,
    @InjectModel(Patient.name) private readonly patientModel: Model<PatientDocument>,
    private readonly patientProfileService: PatientProfileService,
    @Inject(ANTHROPIC_MODEL) private readonly model: LanguageModel,
  ) {}

  async createSession(
    patientId: string,
    dto: CreateChatSessionDto,
  ): Promise<ChatSessionDocument> {
    return this.sessionModel.create({ patient: patientId, type: dto.type });
  }

  async listSessions(patientId: string): Promise<ChatSessionDocument[]> {
    return this.sessionModel.find({ patient: patientId }).sort({ createdAt: -1 }).exec();
  }

  async listMessages(
    sessionId: string,
    patientId: string,
  ): Promise<ChatMessageDocument[]> {
    const session = await this.findSessionById(sessionId);

    if (session.patient.toString() !== patientId) {
      throw new ForbiddenException('Você não tem acesso a esta sessão.');
    }

    return this.messageModel.find({ session: session._id }).sort({ createdAt: 1 }).exec();
  }

  async sendMessage(
    sessionId: string,
    patientId: string,
    dto: CreateChatMessageDto,
  ): Promise<Response> {
    const session = await this.findSessionById(sessionId);

    if (session.patient.toString() !== patientId) {
      throw new ForbiddenException('Você não tem acesso a esta sessão.');
    }

    if (session.recommendedSpecialty) {
      throw new ConflictException(
        'Esta sessão de chat já possui uma recomendação de especialidade e está encerrada.',
      );
    }

    const previousMessages = await this.messageModel
      .find({ session: session._id })
      .sort({ createdAt: 1 })
      .exec();

    await this.messageModel.create({
      session: session._id,
      role: 'user',
      content: dto.content,
    });

    const llmMessages = [
      ...previousMessages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user' as const, content: dto.content },
    ];

    // Perfil clínico rico: opt-in via useInTriage. O mesmo consentimento também
    // libera os dados demográficos (idade, sexo, gênero) para a triagem.
    const richProfile = await this.patientProfileService.findByUserId(patientId);
    const profileForTriage = richProfile as unknown as Partial<IPatientProfile> | null;
    const useProfileInTriage = profileForTriage?.useInTriage === true;

    const patient = await this.patientModel.findOne({ userId: patientId }).exec();
    const age = patient?.dateOfBirth
      ? Math.floor(
          (Date.now() - new Date(patient.dateOfBirth).getTime()) /
            (365.25 * 24 * 60 * 60 * 1000),
        )
      : undefined;
    let systemPrompt = buildTriageSystemPrompt(
      patient
        ? {
            name: patient.name,
            pronouns: patient.pronouns as 'SHE' | 'HE' | 'THEY' | undefined,
            // Dados clínicos só entram no prompt se o paciente autorizou.
            sex: useProfileInTriage ? patient.sex : undefined,
            gender: useProfileInTriage ? patient.gender : undefined,
            age: useProfileInTriage ? age : undefined,
          }
        : undefined,
    );

    const richContext = buildPatientContext(profileForTriage);
    if (richContext) {
      systemPrompt += `\n\n${PATIENT_CONTEXT_SYSTEM_INSTRUCTION}\n\n${richContext}`;
    }

    const result = streamText({
      model: this.model,
      system: systemPrompt,
      messages: llmMessages,
      maxTokens: MAX_RESPONSE_TOKENS,
      onFinish: async ({ text }) => {
        const recommendation = this.parseRecommendation(text);

        await this.messageModel.create({
          session: session._id,
          role: 'assistant',
          content: text,
        });

        if (recommendation) {
          session.recommendedSpecialty = recommendation as Specialty;
          await session.save();
        }
      },
    });

    return result.toDataStreamResponse();
  }

  parseRecommendation(text: string): string | null {
    const match = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (!match) {
      return null;
    }

    try {
      const parsed = JSON.parse(match[1]);
      const value = parsed.recommendedSpecialty;
      return typeof value === 'string' && value.length > 0 ? value : null;
    } catch {
      return null;
    }
  }

  async getSession(
    sessionId: string,
    patientId: string,
  ): Promise<ChatSessionDocument> {
    const session = await this.findSessionById(sessionId);
    if (session.patient.toString() !== patientId) {
      throw new ForbiddenException('Você não tem acesso a esta sessão.');
    }
    return session;
  }

  async findSessionById(sessionId: string): Promise<ChatSessionDocument> {
    const session = await this.sessionModel.findById(sessionId);
    if (!session) {
      throw new NotFoundException('Sessão de chat não encontrada.');
    }
    return session;
  }
}

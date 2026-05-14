jest.mock('ai', () => ({
  streamText: jest.fn(),
}));

import { streamText } from 'ai';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ChatService } from '../chat.service';
import { ChatSession } from '../schemas/chat-session.schema';
import { ChatMessage } from '../schemas/chat-message.schema';
import { ANTHROPIC_MODEL } from '../chat.module';
import { ChatSessionType } from '../enums/chat-session-type.enum';

type StreamTextArgs = {
  model: unknown;
  system: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  onFinish?: (event: { text: string }) => void | Promise<void>;
};

type MockSessionDoc = {
  _id: string;
  patient: string;
  type: ChatSessionType;
  recommendedSpecialty?: string;
  save: jest.Mock;
};

type MockSessionModel = {
  create: jest.Mock;
  findById: jest.Mock;
  find: jest.Mock;
};

type MockMessageModel = {
  create: jest.Mock;
  find: jest.Mock;
};

const flushMicrotasks = () => new Promise<void>((r) => setImmediate(r));

const makeSession = (overrides: Partial<MockSessionDoc> = {}): MockSessionDoc => ({
  _id: 'sess-1',
  patient: 'patient-1',
  type: ChatSessionType.SYMPTOM_TRIAGE,
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

describe('ChatService', () => {
  let service: ChatService;
  let sessionModel: MockSessionModel;
  let messageModel: MockMessageModel;

  beforeEach(async () => {
    (streamText as jest.Mock).mockReset();

    sessionModel = {
      create: jest.fn(),
      findById: jest.fn(),
      find: jest.fn(),
    };

    messageModel = {
      create: jest.fn(),
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: getModelToken(ChatSession.name), useValue: sessionModel },
        { provide: getModelToken(ChatMessage.name), useValue: messageModel },
        { provide: ANTHROPIC_MODEL, useValue: {} },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
  });

  describe('createSession', () => {
    it('creates and returns a chat session', async () => {
      const patientId = 'patient-1';
      const dto = { type: ChatSessionType.SYMPTOM_TRIAGE };
      const created = { _id: 'sess-1', patient: patientId, type: dto.type };

      sessionModel.create.mockResolvedValue(created);

      const result = await service.createSession(patientId, dto);

      expect(sessionModel.create).toHaveBeenCalledWith({
        patient: patientId,
        type: dto.type,
      });
      expect(result).toEqual(created);
    });
  });

  describe('listSessions', () => {
    it('returns sessions for a patient', async () => {
      const patientId = 'patient-1';
      const sessions = [
        { _id: 'sess-1', patient: patientId, type: ChatSessionType.SYMPTOM_TRIAGE },
      ];

      sessionModel.find.mockReturnValue({
        sort: () => ({
          exec: () => Promise.resolve(sessions),
        }),
      });

      const result = await service.listSessions(patientId);

      expect(sessionModel.find).toHaveBeenCalledWith({ patient: patientId });
      expect(result).toEqual(sessions);
    });
  });

  describe('listMessages', () => {
    it('returns messages for a session owned by the patient', async () => {
      const session = makeSession();
      const messages = [
        { _id: 'msg-1', session: 'sess-1', role: 'user', content: 'hello' },
      ];

      sessionModel.findById.mockResolvedValue(session);
      messageModel.find.mockReturnValue({
        sort: () => ({
          exec: () => Promise.resolve(messages),
        }),
      });

      const result = await service.listMessages('sess-1', 'patient-1');

      expect(sessionModel.findById).toHaveBeenCalledWith('sess-1');
      expect(messageModel.find).toHaveBeenCalledWith({ session: session._id });
      expect(result).toEqual(messages);
    });

    it('throws NotFoundException when session does not exist', async () => {
      sessionModel.findById.mockResolvedValue(null);

      await expect(service.listMessages('missing', 'patient-1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('throws ForbiddenException when session belongs to another patient', async () => {
      sessionModel.findById.mockResolvedValue(makeSession({ patient: 'other' }));

      await expect(service.listMessages('sess-1', 'patient-1')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });
  });

  describe('parseRecommendation', () => {
    it('returns null when text has no JSON block', () => {
      const result = (service as any).parseRecommendation('No recommendation here.');
      expect(result).toBeNull();
    });

    it('parses recommendedSpecialty from valid JSON block', () => {
      const text =
        'You should see a specialist. ```json\n{"recommendedSpecialty":"cardiology"}\n```';
      const result = (service as any).parseRecommendation(text);
      expect(result).toBe('cardiology');
    });

    it('returns null when JSON block does not contain recommendedSpecialty', () => {
      const text = 'Some text. ```json\n{"other":"value"}\n```';
      const result = (service as any).parseRecommendation(text);
      expect(result).toBeNull();
    });

    it('returns null when JSON is malformed', () => {
      const text = 'Some text. ```json\nnot-valid-json\n```';
      const result = (service as any).parseRecommendation(text);
      expect(result).toBeNull();
    });
  });

  describe('sendMessage', () => {
    it('persists user and assistant messages and updates recommended specialty', async () => {
      const session = makeSession();
      sessionModel.findById.mockResolvedValue(session);
      messageModel.find.mockReturnValue({
        sort: () => ({
          exec: () => Promise.resolve([]),
        }),
      });
      messageModel.create.mockResolvedValue({});

      const assistantText =
        'You should see a cardiologist. ```json\n{"recommendedSpecialty":"cardiology"}\n```';

      (streamText as jest.Mock).mockImplementation(({ onFinish }: StreamTextArgs) => {
        queueMicrotask(() => onFinish?.({ text: assistantText }));
        return {
          toDataStreamResponse: () =>
            new Response('data: ...\n\n', {
              headers: { 'Content-Type': 'text/event-stream' },
            }),
        };
      });

      const result = await service.sendMessage('sess-1', 'patient-1', {
        content: 'I have chest pain',
      });

      expect(result).toBeInstanceOf(Response);
      expect(result.headers.get('Content-Type')).toContain('text/event-stream');

      expect(messageModel.create).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          session: session._id,
          role: 'user',
          content: 'I have chest pain',
        }),
      );

      expect(streamText).toHaveBeenCalledTimes(1);
      const callArg = (streamText as jest.Mock).mock.calls[0][0] as StreamTextArgs;
      expect(callArg.system).toEqual(expect.any(String));
      expect(callArg.messages).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ role: 'user', content: 'I have chest pain' }),
        ]),
      );
      expect(typeof callArg.onFinish).toBe('function');

      await flushMicrotasks();

      expect(messageModel.create).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          session: session._id,
          role: 'assistant',
          content: assistantText,
        }),
      );

      expect(session.recommendedSpecialty).toBe('cardiology');
      expect(session.save).toHaveBeenCalledTimes(1);
    });

    it('does not update session when assistant text has no recommendation', async () => {
      const session = makeSession();
      sessionModel.findById.mockResolvedValue(session);
      messageModel.find.mockReturnValue({
        sort: () => ({
          exec: () => Promise.resolve([]),
        }),
      });
      messageModel.create.mockResolvedValue({});

      (streamText as jest.Mock).mockImplementation(({ onFinish }: StreamTextArgs) => {
        queueMicrotask(() => onFinish?.({ text: 'Tell me more about your symptoms.' }));
        return {
          toDataStreamResponse: () => new Response(null),
        };
      });

      await service.sendMessage('sess-1', 'patient-1', { content: 'hello' });
      await flushMicrotasks();

      expect(session.recommendedSpecialty).toBeUndefined();
      expect(session.save).not.toHaveBeenCalled();

      expect(messageModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'assistant',
          content: 'Tell me more about your symptoms.',
        }),
      );
    });

    it('throws NotFoundException when session does not exist', async () => {
      sessionModel.findById.mockResolvedValue(null);

      await expect(
        service.sendMessage('missing', 'patient-1', { content: 'hi' }),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(streamText).not.toHaveBeenCalled();
      expect(messageModel.create).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when session belongs to another patient', async () => {
      sessionModel.findById.mockResolvedValue(makeSession({ patient: 'other' }));

      await expect(
        service.sendMessage('sess-1', 'patient-1', { content: 'hi' }),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(streamText).not.toHaveBeenCalled();
    });

    it('passes conversation history to streamText', async () => {
      const session = makeSession();
      sessionModel.findById.mockResolvedValue(session);

      const priorMessages = [
        { role: 'user', content: 'first message' },
        { role: 'assistant', content: 'first response' },
      ];

      messageModel.find.mockReturnValue({
        sort: () => ({
          exec: () => Promise.resolve(priorMessages),
        }),
      });
      messageModel.create.mockResolvedValue({});

      (streamText as jest.Mock).mockImplementation(() => ({
        toDataStreamResponse: () =>
          new Response(null, {
            headers: { 'Content-Type': 'text/event-stream' },
          }),
      }));

      await service.sendMessage('sess-1', 'patient-1', { content: 'second message' });

      const callArg = (streamText as jest.Mock).mock.calls[0][0] as StreamTextArgs;

      expect(callArg.messages).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ role: 'user', content: 'first message' }),
          expect.objectContaining({ role: 'assistant', content: 'first response' }),
          expect.objectContaining({ role: 'user', content: 'second message' }),
        ]),
      );
    });
  });
});

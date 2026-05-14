jest.mock('ai', () => ({
  streamText: jest.fn(),
}));

import { streamText } from 'ai';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ChatService } from '../chat.service';
import { ANTHROPIC_MODEL } from '../chat.module';
import { ChatSession } from '../schemas/chat-session.schema';
import { ChatMessage } from '../schemas/chat-message.schema';

describe('ChatService', () => {
  let service: ChatService;
  let sessionModel: {
    create: jest.Mock;
    find: jest.Mock;
    findOne: jest.Mock;
    findById: jest.Mock;
  };
  let messageModel: {
    create: jest.Mock;
    find: jest.Mock;
  };

  const streamTextMock = streamText as jest.MockedFunction<typeof streamText>;

  const fakeStreamReturn = {
    toDataStreamResponse: () =>
      new Response('data: chunk\n\n', {
        headers: { 'Content-Type': 'text/event-stream' },
      }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    sessionModel = {
      create: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      findById: jest.fn(),
    };

    messageModel = {
      create: jest.fn(),
      find: jest.fn(),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: getModelToken(ChatSession.name), useValue: sessionModel },
        { provide: getModelToken(ChatMessage.name), useValue: messageModel },
        { provide: ANTHROPIC_MODEL, useValue: {} },
      ],
    }).compile();

    service = moduleRef.get(ChatService);
  });

  describe('createSession', () => {
    it('creates and returns a new chat session', async () => {
      const userId = 'user-1';
      const dto = { type: 'triage' };
      const created = { _id: 'sess-1', userId, type: 'triage' };

      sessionModel.create.mockResolvedValue(created);

      const result = await service.createSession(userId, dto as any);

      expect(sessionModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId, type: 'triage' }),
      );
      expect(result).toEqual(created);
    });
  });

  describe('listSessions', () => {
    it('returns all sessions for a user', async () => {
      const userId = 'user-1';
      const sessions = [{ _id: 'sess-1', userId }];

      sessionModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(sessions),
        }),
      });

      const result = await service.listSessions(userId);

      expect(sessionModel.find).toHaveBeenCalledWith({ userId });
      expect(result).toEqual(sessions);
    });
  });

  describe('listMessages', () => {
    it('returns all messages for a session', async () => {
      const sessionId = 'sess-1';
      const messages = [{ _id: 'msg-1', sessionId }];

      messageModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(messages),
        }),
      });

      const result = await service.listMessages(sessionId);

      expect(messageModel.find).toHaveBeenCalledWith({ sessionId });
      expect(result).toEqual(messages);
    });
  });

  describe('parseRecommendation', () => {
    it('extracts specialty from a JSON code block', () => {
      const text =
        'Based on your symptoms ```json\n{"specialty":"cardiology"}\n```';
      const result = (service as any).parseRecommendation(text);
      expect(result).toBe('cardiology');
    });

    it('returns null when no JSON block is present', () => {
      const result = (service as any).parseRecommendation('Plain text');
      expect(result).toBeNull();
    });

    it('returns null when JSON block has no specialty field', () => {
      const text = '```json\n{"other":"value"}\n```';
      const result = (service as any).parseRecommendation(text);
      expect(result).toBeNull();
    });
  });

  describe('sendMessage', () => {
    let session: {
      _id: string;
      userId: string;
      type: string;
      recommendedSpecialty: string | undefined;
      save: jest.Mock;
    };
    let capturedOnFinish:
      | ((arg: { text: string }) => Promise<void> | void)
      | undefined;

    beforeEach(() => {
      session = {
        _id: 'sess-1',
        userId: 'user-1',
        type: 'triage',
        recommendedSpecialty: undefined,
        save: jest.fn().mockResolvedValue(undefined),
      };

      sessionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(session),
      });

      messageModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([]),
        }),
      });

      messageModel.create.mockResolvedValue({ _id: 'msg-x' });

      streamTextMock.mockImplementation((opts: any) => {
        capturedOnFinish = opts.onFinish;
        return fakeStreamReturn as any;
      });
    });

    it('persists user message and returns a streaming Response', async () => {
      const response = await service.sendMessage('sess-1', 'user-1', {
        content: 'Hello',
      });

      expect(messageModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 'sess-1',
          role: 'user',
          content: 'Hello',
        }),
      );
      expect(streamTextMock).toHaveBeenCalledTimes(1);
      expect(response).toBeInstanceOf(Response);
    });

    it('persists assistant message after the stream finishes', async () => {
      await service.sendMessage('sess-1', 'user-1', { content: 'Hello' });
      await capturedOnFinish!({ text: 'Assistant reply' });

      expect(messageModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 'sess-1',
          role: 'assistant',
          content: 'Assistant reply',
        }),
      );
    });

    it('updates session.recommendedSpecialty when the LLM returns a recommendation', async () => {
      await service.sendMessage('sess-1', 'user-1', { content: 'Chest pain' });
      await capturedOnFinish!({
        text: 'Reply ```json\n{"specialty":"cardiology"}\n```',
      });

      expect(session.recommendedSpecialty).toBe('cardiology');
      expect(session.save).toHaveBeenCalledTimes(1);
    });

    it('does not update session when no recommendation is present', async () => {
      await service.sendMessage('sess-1', 'user-1', { content: 'Hi' });
      await capturedOnFinish!({ text: 'Plain reply' });

      expect(session.recommendedSpecialty).toBeUndefined();
      expect(session.save).not.toHaveBeenCalled();
    });

    it('throws when the session does not exist', async () => {
      sessionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.sendMessage('missing', 'user-1', { content: 'Hi' }),
      ).rejects.toThrow();
      expect(streamTextMock).not.toHaveBeenCalled();
    });

    it('throws when the session belongs to another user', async () => {
      sessionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ ...session, userId: 'other-user' }),
      });

      await expect(
        service.sendMessage('sess-1', 'user-1', { content: 'Hi' }),
      ).rejects.toThrow();
      expect(streamTextMock).not.toHaveBeenCalled();
    });
  });
});

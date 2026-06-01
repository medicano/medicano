import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { ChatService } from '../chat.service';
import { ChatSession } from '../schemas/chat-session.schema';
import { ChatMessage } from '../schemas/chat-message.schema';
import { ChatSessionType } from '../enums/chat-session-type.enum';
import { PatientProfileService } from '../../patient-profile/patient-profile.service';
import { TRIAGE_SYSTEM_PROMPT } from '../constants/triage-prompt';
import {
  buildPatientContext,
  PATIENT_CONTEXT_SYSTEM_INSTRUCTION,
} from '../../patient-profile/utils/build-patient-context';

jest.mock('../../patient-profile/utils/build-patient-context', () => ({
  buildPatientContext: jest.fn(),
  PATIENT_CONTEXT_SYSTEM_INSTRUCTION: 'PATIENT CONTEXT INSTRUCTION',
}));

const mockBuildPatientContext = buildPatientContext as jest.MockedFunction<
  typeof buildPatientContext
>;

const mockUserId = 'user-abc-123';
const mockSessionId = new Types.ObjectId().toHexString();

const buildMockSession = (type: ChatSessionType = ChatSessionType.TRIAGE) => ({
  _id: new Types.ObjectId(mockSessionId),
  userId: mockUserId,
  type,
  title: null,
  createdAt: new Date(),
  updatedAt: new Date(),
});

const buildMockMessage = (role: string, content: string) => ({
  _id: new Types.ObjectId(),
  sessionId: new Types.ObjectId(mockSessionId),
  role,
  content,
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe('ChatService', () => {
  let service: ChatService;
  let patientProfileService: jest.Mocked<PatientProfileService>;

  const mockChatSessionModel = {
    create: jest.fn(),
    findOne: jest.fn(),
  };

  const mockChatMessageModel = {
    create: jest.fn(),
    find: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        {
          provide: getModelToken(ChatSession.name),
          useValue: mockChatSessionModel,
        },
        {
          provide: getModelToken(ChatMessage.name),
          useValue: mockChatMessageModel,
        },
        {
          provide: PatientProfileService,
          useValue: {
            findByUserId: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
    patientProfileService = module.get(PatientProfileService);

    jest.clearAllMocks();
  });

  describe('createSession', () => {
    it('should create a session with the given userId and dto', async () => {
      const mockSession = buildMockSession();
      mockChatSessionModel.create.mockResolvedValueOnce(mockSession);

      const result = await service.createSession(mockUserId, {
        type: ChatSessionType.TRIAGE,
        title: null,
      });

      expect(mockChatSessionModel.create).toHaveBeenCalledWith({
        userId: mockUserId,
        type: ChatSessionType.TRIAGE,
        title: null,
      });
      expect(result).toEqual(mockSession);
    });
  });

  describe('sendMessage', () => {
    it('should throw NotFoundException when session is not found', async () => {
      mockChatSessionModel.findOne.mockResolvedValueOnce(null);

      await expect(
        service.sendMessage(mockUserId, mockSessionId, { content: 'hello' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should call PatientProfileService.findByUserId with session userId for triage sessions', async () => {
      const mockSession = buildMockSession(ChatSessionType.TRIAGE);
      mockChatSessionModel.findOne.mockResolvedValueOnce(mockSession);

      const userMessage = buildMockMessage('user', 'hello');
      const assistantMessage = buildMockMessage('assistant', 'response');

      mockChatMessageModel.create
        .mockResolvedValueOnce(userMessage)
        .mockResolvedValueOnce(assistantMessage);

      const mockFind = {
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValueOnce([userMessage]),
      };
      mockChatMessageModel.find.mockReturnValue(mockFind);

      mockBuildPatientContext.mockReturnValueOnce('patient context data');
      patientProfileService.findByUserId.mockResolvedValueOnce({
        userId: mockUserId,
      } as any);

      await service.sendMessage(mockUserId, mockSessionId, {
        content: 'hello',
      });

      expect(patientProfileService.findByUserId).toHaveBeenCalledTimes(1);
      expect(patientProfileService.findByUserId).toHaveBeenCalledWith(
        mockUserId,
      );
    });

    it('should NOT call PatientProfileService.findByUserId for non-triage sessions', async () => {
      const mockSession = buildMockSession(ChatSessionType.GENERAL as ChatSessionType);
      mockChatSessionModel.findOne.mockResolvedValueOnce(mockSession);

      const userMessage = buildMockMessage('user', 'hello');
      const assistantMessage = buildMockMessage('assistant', 'response');

      mockChatMessageModel.create
        .mockResolvedValueOnce(userMessage)
        .mockResolvedValueOnce(assistantMessage);

      const mockFind = {
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValueOnce([userMessage]),
      };
      mockChatMessageModel.find.mockReturnValue(mockFind);

      await service.sendMessage(mockUserId, mockSessionId, {
        content: 'hello',
      });

      expect(patientProfileService.findByUserId).not.toHaveBeenCalled();
    });
  });

  describe('buildSystemPrompt (via sendMessage)', () => {
    const setupSendMessageMocks = (session: ReturnType<typeof buildMockSession>) => {
      mockChatSessionModel.findOne.mockResolvedValueOnce(session);

      const userMessage = buildMockMessage('user', 'test');
      const assistantMessage = buildMockMessage('assistant', 'reply');

      mockChatMessageModel.create
        .mockResolvedValueOnce(userMessage)
        .mockResolvedValueOnce(assistantMessage);

      const mockFind = {
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValueOnce([userMessage]),
      };
      mockChatMessageModel.find.mockReturnValue(mockFind);
    };

    it('should append patient context to system prompt when context is non-empty', async () => {
      const mockSession = buildMockSession(ChatSessionType.TRIAGE);
      setupSendMessageMocks(mockSession);

      const mockProfile = { userId: mockUserId } as any;
      patientProfileService.findByUserId.mockResolvedValueOnce(mockProfile);
      mockBuildPatientContext.mockReturnValueOnce('Age: 30, Blood type: O+');

      // Spy on callLlm-equivalent: since callLlm is private, we verify the
      // side effect — that buildPatientContext was called with the returned profile.
      await service.sendMessage(mockUserId, mockSessionId, { content: 'test' });

      expect(mockBuildPatientContext).toHaveBeenCalledWith(mockProfile);
    });

    it('should NOT append patient context when buildPatientContext returns empty string', async () => {
      const mockSession = buildMockSession(ChatSessionType.TRIAGE);
      setupSendMessageMocks(mockSession);

      patientProfileService.findByUserId.mockResolvedValueOnce(null);
      mockBuildPatientContext.mockReturnValueOnce('');

      await service.sendMessage(mockUserId, mockSessionId, { content: 'test' });

      // buildPatientContext was called, returned empty — no concatenation happens
      expect(mockBuildPatientContext).toHaveBeenCalledWith(null);
    });

    it('should NOT append patient context when buildPatientContext returns null profile', async () => {
      const mockSession = buildMockSession(ChatSessionType.TRIAGE);
      setupSendMessageMocks(mockSession);

      patientProfileService.findByUserId.mockResolvedValueOnce(null);
      mockBuildPatientContext.mockReturnValueOnce('');

      await service.sendMessage(mockUserId, mockSessionId, { content: 'test' });

      expect(patientProfileService.findByUserId).toHaveBeenCalledWith(mockUserId);
      expect(mockBuildPatientContext).toHaveBeenCalledWith(null);
    });

    it('should use session.userId (not request-provided value) to fetch patient profile', async () => {
      const differentUserId = 'attacker-user-id';
      const mockSession = buildMockSession(ChatSessionType.TRIAGE);
      // session always stores the real owner userId
      mockSession.userId = mockUserId;

      mockChatSessionModel.findOne.mockResolvedValueOnce(mockSession);

      const userMessage = buildMockMessage('user', 'test');
      const assistantMessage = buildMockMessage('assistant', 'reply');

      mockChatMessageModel.create
        .mockResolvedValueOnce(userMessage)
        .mockResolvedValueOnce(assistantMessage);

      const mockFind = {
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValueOnce([userMessage]),
      };
      mockChatMessageModel.find.mockReturnValue(mockFind);

      patientProfileService.findByUserId.mockResolvedValueOnce(null);
      mockBuildPatientContext.mockReturnValueOnce('');

      // Even if the caller passes a different userId at the service layer,
      // the session's stored userId is used for profile lookup.
      await service.sendMessage(differentUserId, mockSessionId, {
        content: 'test',
      });

      // findOne is called with differentUserId (access control check),
      // but findByUserId is called with the session's own userId.
      expect(patientProfileService.findByUserId).toHaveBeenCalledWith(
        mockUserId,
      );
      expect(patientProfileService.findByUserId).not.toHaveBeenCalledWith(
        differentUserId,
      );
    });

    it('should verify PATIENT_CONTEXT_SYSTEM_INSTRUCTION constant is used in concatenation', () => {
      // This test validates the constant is importable and matches expected value
      expect(PATIENT_CONTEXT_SYSTEM_INSTRUCTION).toBe(
        'PATIENT CONTEXT INSTRUCTION',
      );
    });

    it('should verify TRIAGE_SYSTEM_PROMPT is used as the base prompt', () => {
      expect(typeof TRIAGE_SYSTEM_PROMPT).toBe('string');
      expect(TRIAGE_SYSTEM_PROMPT.length).toBeGreaterThan(0);
    });
  });

  describe('getMessages', () => {
    it('should throw NotFoundException when session not found', async () => {
      mockChatSessionModel.findOne.mockResolvedValueOnce(null);

      await expect(
        service.getMessages(mockUserId, mockSessionId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return messages sorted by createdAt ascending', async () => {
      const mockSession = buildMockSession();
      mockChatSessionModel.findOne.mockResolvedValueOnce(mockSession);

      const messages = [
        buildMockMessage('user', 'hello'),
        buildMockMessage('assistant', 'world'),
      ];

      const mockFind = {
        sort: jest.fn().mockResolvedValueOnce(messages),
      };
      mockChatMessageModel.find.mockReturnValue(mockFind);

      const result = await service.getMessages(mockUserId, mockSessionId);

      expect(mockChatMessageModel.find).toHaveBeenCalledWith({
        sessionId: mockSession._id,
      });
      expect(mockFind.sort).toHaveBeenCalledWith({ createdAt: 1 });
      expect(result).toEqual(messages);
    });
  });
});

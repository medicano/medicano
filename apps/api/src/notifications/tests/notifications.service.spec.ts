const mockSend = jest.fn();

jest.mock('@aws-sdk/client-ses', () => ({
  SESClient: jest.fn().mockImplementation(() => ({ send: mockSend })),
  SendEmailCommand: jest.fn().mockImplementation((input) => ({ input })),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';

import { NotificationsService } from '../notifications.service';
import { Patient } from '../../patients/schemas/patient.schema';
import { User } from '../../auth/schemas/user.schema';
import { ProfessionalsService } from '../../professionals/professionals.service';

describe('NotificationsService', () => {
  let service: NotificationsService;

  const patientModel = {
    findOne: jest.fn(),
    findById: jest.fn(),
  };
  const userModel = {
    findById: jest.fn(),
    findOne: jest.fn(),
  };
  const professionalsService = {
    findById: jest.fn(),
  };
  const configService = {
    get: jest.fn().mockImplementation((key: string) => {
      if (key === 'ses') {
        return { region: 'us-east-1', fromEmail: 'no-reply@medicano.app' };
      }
      return undefined;
    }),
  };

  const patientDoc = {
    _id: 'patient-1',
    userId: 'user-patient-1',
    name: 'John Patient',
  };
  const patientUser = {
    _id: 'user-patient-1',
    email: 'patient@test.com',
    name: 'John Patient',
  };
  const professionalDoc = {
    _id: 'prof-1',
    userId: 'user-prof-1',
    name: 'Dr. House',
  };
  const professionalUser = {
    _id: 'user-prof-1',
    email: 'doctor@test.com',
    name: 'Dr. House',
  };

  const appointment = {
    _id: 'appt-1',
    patientId: 'user-patient-1',
    professionalId: 'prof-1',
    startAt: new Date('2025-01-10T10:00:00Z'),
    endAt: new Date('2025-01-10T10:30:00Z'),
    status: 'pending' as const,
  };

  const setupHappyLookups = () => {
    patientModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue(patientDoc),
    });
    patientModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(patientDoc),
    });

    userModel.findById.mockImplementation((id: string) => {
      const doc =
        id === patientUser._id
          ? patientUser
          : id === professionalUser._id
            ? professionalUser
            : null;
      return { exec: jest.fn().mockResolvedValue(doc) };
    });
    userModel.findOne.mockImplementation((filter: any) => {
      const id = filter?._id;
      const doc =
        id === patientUser._id
          ? patientUser
          : id === professionalUser._id
            ? professionalUser
            : null;
      return { exec: jest.fn().mockResolvedValue(doc) };
    });

    professionalsService.findById.mockResolvedValue(professionalDoc);
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: getModelToken(Patient.name), useValue: patientModel },
        { provide: getModelToken(User.name), useValue: userModel },
        { provide: ProfessionalsService, useValue: professionalsService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockSend.mockReset();
    mockSend.mockResolvedValue({ MessageId: 'fake' });
  });

  describe('notifyAppointmentCreated', () => {
    it('sends email to both patient and professional', async () => {
      setupHappyLookups();
      mockSend.mockResolvedValue({ MessageId: 'fake' });

      await service.notifyAppointmentCreated(appointment as any);

      expect(mockSend).toHaveBeenCalledTimes(2);

      const sentDestinations = mockSend.mock.calls
        .map(([cmd]: [any]) => cmd?.input?.Destination?.ToAddresses ?? [])
        .flat();

      expect(sentDestinations).toEqual(
        expect.arrayContaining([patientUser.email, professionalUser.email]),
      );
    });
  });

  describe('notifyAppointmentConfirmed', () => {
    it('sends email only to patient', async () => {
      setupHappyLookups();
      mockSend.mockResolvedValue({ MessageId: 'fake' });

      await service.notifyAppointmentConfirmed(appointment as any);

      expect(mockSend).toHaveBeenCalledTimes(1);
      const [cmd] = mockSend.mock.calls[0];
      expect(cmd.input.Destination.ToAddresses).toContain(patientUser.email);
      expect(cmd.input.Destination.ToAddresses).not.toContain(
        professionalUser.email,
      );
    });
  });

  describe('notifyAppointmentCancelled', () => {
    it('when cancelledBy=patient, sends to professional only', async () => {
      setupHappyLookups();
      mockSend.mockResolvedValue({ MessageId: 'fake' });

      await service.notifyAppointmentCancelled(
        appointment as any,
        'patient' as any,
      );

      expect(mockSend).toHaveBeenCalledTimes(1);
      const [cmd] = mockSend.mock.calls[0];
      expect(cmd.input.Destination.ToAddresses).toContain(
        professionalUser.email,
      );
      expect(cmd.input.Destination.ToAddresses).not.toContain(
        patientUser.email,
      );
    });

    it('when cancelledBy=provider, sends to patient only', async () => {
      setupHappyLookups();
      mockSend.mockResolvedValue({ MessageId: 'fake' });

      await service.notifyAppointmentCancelled(
        appointment as any,
        'provider' as any,
      );

      expect(mockSend).toHaveBeenCalledTimes(1);
      const [cmd] = mockSend.mock.calls[0];
      expect(cmd.input.Destination.ToAddresses).toContain(patientUser.email);
      expect(cmd.input.Destination.ToAddresses).not.toContain(
        professionalUser.email,
      );
    });
  });

  describe('sendEmail resilience', () => {
    it('SES error is caught and logged, does not throw', async () => {
      setupHappyLookups();
      mockSend.mockRejectedValue(new Error('SES down'));

      const loggerField = (service as any).logger ?? console;
      const loggerSpy = jest
        .spyOn(loggerField, 'error')
        .mockImplementation(() => undefined);

      await expect(
        service.notifyAppointmentConfirmed(appointment as any),
      ).resolves.not.toThrow();

      loggerSpy.mockRestore();
    });
  });
});

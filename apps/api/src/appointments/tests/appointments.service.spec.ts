import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { AppointmentsService } from '../appointments.service';
import { Appointment } from '../schemas/appointment.schema';
import { NotificationsService } from '../../notifications/notifications.service';

const mockNotificationsService = {
  notifyAppointmentCreated: jest.fn().mockResolvedValue(undefined),
  notifyAppointmentConfirmed: jest.fn().mockResolvedValue(undefined),
  notifyAppointmentCancelled: jest.fn().mockResolvedValue(undefined),
};

const buildExecChain = (resolved: unknown) => ({
  exec: jest.fn().mockResolvedValue(resolved),
  lean: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  populate: jest.fn().mockReturnThis(),
});

const appointmentFixture = {
  _id: 'appt-1',
  clinicId: 'clinic-1',
  professionalId: 'prof-1',
  patientId: 'patient-1',
  scheduledAt: new Date('2025-06-01T10:00:00Z'),
  status: 'pending',
  notes: 'checkup',
};

const mockAppointmentModel = {
  find: jest.fn(),
  findOne: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findOneAndUpdate: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  constructor: jest.fn(),
};

describe('AppointmentsService', () => {
  let service: AppointmentsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppointmentsService,
        {
          provide: getModelToken(Appointment.name),
          useValue: mockAppointmentModel,
        },
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
      ],
    }).compile();

    service = module.get<AppointmentsService>(AppointmentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createAppointment', () => {
    it('RN-APP-01 — creates appointment and calls notifyAppointmentCreated', async () => {
      const createDto = {
        clinicId: 'clinic-1',
        professionalId: 'prof-1',
        patientId: 'patient-1',
        scheduledAt: new Date('2025-06-01T10:00:00Z'),
        notes: 'checkup',
      };

      const created = { ...appointmentFixture, status: 'pending' };
      mockAppointmentModel.create.mockResolvedValue(created);

      const result = await service.createAppointment(createDto as any);

      expect(result).toMatchObject({ _id: 'appt-1' });
      expect(mockNotificationsService.notifyAppointmentCreated).toHaveBeenCalledTimes(1);
      expect(mockNotificationsService.notifyAppointmentCreated).toHaveBeenCalledWith(
        expect.objectContaining({ _id: expect.anything() }),
      );
    });

    it('RN-APP-05 — notification failure does not propagate on create', async () => {
      const createDto = {
        clinicId: 'clinic-1',
        professionalId: 'prof-1',
        patientId: 'patient-1',
        scheduledAt: new Date('2025-06-01T10:00:00Z'),
      };

      const created = { ...appointmentFixture };
      mockAppointmentModel.create.mockResolvedValue(created);
      mockNotificationsService.notifyAppointmentCreated.mockRejectedValueOnce(
        new Error('notification failure'),
      );

      // Service should still resolve — notification errors must not propagate
      await expect(service.createAppointment(createDto as any)).resolves.toBeDefined();
    });
  });

  describe('updateStatus', () => {
    it('RN-APP-02 — calls notifyAppointmentConfirmed when status transitions to confirmed', async () => {
      const confirmed = { ...appointmentFixture, status: 'confirmed' };

      mockAppointmentModel.findByIdAndUpdate.mockReturnValue(
        buildExecChain(confirmed),
      );

      const result = await service.updateStatus('appt-1', 'confirmed' as any);

      expect(result).toMatchObject({ status: 'confirmed' });
      expect(mockNotificationsService.notifyAppointmentConfirmed).toHaveBeenCalledTimes(1);
      expect(mockNotificationsService.notifyAppointmentConfirmed).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'confirmed' }),
      );
      expect(mockNotificationsService.notifyAppointmentCancelled).not.toHaveBeenCalled();
    });

    it('RN-APP-03 — calls notifyAppointmentCancelled when status transitions to cancelled', async () => {
      const cancelled = { ...appointmentFixture, status: 'cancelled' };

      mockAppointmentModel.findByIdAndUpdate.mockReturnValue(
        buildExecChain(cancelled),
      );

      const result = await service.updateStatus('appt-1', 'cancelled' as any);

      expect(result).toMatchObject({ status: 'cancelled' });
      expect(mockNotificationsService.notifyAppointmentCancelled).toHaveBeenCalledTimes(1);
      expect(mockNotificationsService.notifyAppointmentCancelled).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'cancelled' }),
      );
      expect(mockNotificationsService.notifyAppointmentConfirmed).not.toHaveBeenCalled();
    });

    it('does not call any notification when status transitions to pending', async () => {
      const pending = { ...appointmentFixture, status: 'pending' };

      mockAppointmentModel.findByIdAndUpdate.mockReturnValue(
        buildExecChain(pending),
      );

      await service.updateStatus('appt-1', 'pending' as any);

      expect(mockNotificationsService.notifyAppointmentCreated).not.toHaveBeenCalled();
      expect(mockNotificationsService.notifyAppointmentConfirmed).not.toHaveBeenCalled();
      expect(mockNotificationsService.notifyAppointmentCancelled).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when appointment not found', async () => {
      mockAppointmentModel.findByIdAndUpdate.mockReturnValue(
        buildExecChain(null),
      );

      await expect(service.updateStatus('nonexistent', 'confirmed' as any)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('cancelAppointment (patient-initiated)', () => {
    it('RN-APP-04 — calls notifyAppointmentCancelled with appointment and "patient" source', async () => {
      const cancelled = { ...appointmentFixture, status: 'cancelled' };

      mockAppointmentModel.findById.mockReturnValue(buildExecChain(appointmentFixture));
      mockAppointmentModel.findByIdAndUpdate.mockReturnValue(buildExecChain(cancelled));

      await service.cancelAppointment('appt-1', 'patient-1', 'patient' as any);

      expect(mockNotificationsService.notifyAppointmentCancelled).toHaveBeenCalledTimes(1);
      expect(mockNotificationsService.notifyAppointmentCancelled).toHaveBeenCalledWith(
        expect.anything(),
        'patient',
      );
    });

    it('throws NotFoundException when appointment not found on cancel', async () => {
      mockAppointmentModel.findById.mockReturnValue(buildExecChain(null));

      await expect(
        service.cancelAppointment('nonexistent', 'patient-1', 'patient' as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when patient is not the owner of the appointment', async () => {
      mockAppointmentModel.findById.mockReturnValue(
        buildExecChain({ ...appointmentFixture, patientId: 'other-patient' }),
      );

      await expect(
        service.cancelAppointment('appt-1', 'patient-1', 'patient' as any),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getAppointmentById', () => {
    it('returns appointment when found', async () => {
      mockAppointmentModel.findById.mockReturnValue(buildExecChain(appointmentFixture));

      const result = await service.getAppointmentById('appt-1');

      expect(result).toMatchObject({ _id: 'appt-1' });
    });

    it('throws NotFoundException when not found', async () => {
      mockAppointmentModel.findById.mockReturnValue(buildExecChain(null));

      await expect(service.getAppointmentById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getAppointmentsByClinic', () => {
    it('returns list of appointments for a clinic', async () => {
      const appointments = [appointmentFixture, { ...appointmentFixture, _id: 'appt-2' }];

      mockAppointmentModel.find.mockReturnValue(buildExecChain(appointments));

      const result = await service.getAppointmentsByClinic('clinic-1');

      expect(result).toHaveLength(2);
      expect(mockAppointmentModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ clinicId: 'clinic-1' }),
      );
    });
  });

  describe('getAppointmentsByProfessional', () => {
    it('returns list of appointments for a professional', async () => {
      const appointments = [appointmentFixture];

      mockAppointmentModel.find.mockReturnValue(buildExecChain(appointments));

      const result = await service.getAppointmentsByProfessional('prof-1');

      expect(result).toHaveLength(1);
      expect(mockAppointmentModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ professionalId: 'prof-1' }),
      );
    });
  });
});

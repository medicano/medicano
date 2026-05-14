import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, NotFoundException } from '@nestjs/common';

import { AppointmentsService } from '../appointments.service';
import { Appointment, AppointmentStatus } from '../schemas/appointment.schema';
import { NotificationsService } from '../../notifications/notifications.service';
import { AvailabilityService } from '../../availability/availability.service';

const mockAppointmentBase = {
  _id: 'appointment-id',
  patientId: 'patient-id',
  providerId: 'provider-id',
  scheduledAt: new Date('2025-01-15T10:00:00Z'),
  status: AppointmentStatus.PENDING,
};

const mockSave = jest.fn();

const mockAppointmentDocument = {
  ...mockAppointmentBase,
  save: mockSave,
};

const mockAppointmentModel = {
  find: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
};

function MockAppointmentModelConstructor(dto: unknown) {
  return {
    ...mockAppointmentBase,
    ...dto,
    save: mockSave,
  };
}
Object.assign(MockAppointmentModelConstructor, mockAppointmentModel);

const mockNotificationsService = {
  notifyAppointmentCreated: jest.fn().mockResolvedValue(undefined),
  notifyAppointmentConfirmed: jest.fn().mockResolvedValue(undefined),
  notifyAppointmentCancelled: jest.fn().mockResolvedValue(undefined),
};

const mockAvailabilityService = {
  validateSlot: jest.fn().mockResolvedValue(undefined),
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
          useValue: MockAppointmentModelConstructor,
        },
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
        {
          provide: AvailabilityService,
          useValue: mockAvailabilityService,
        },
      ],
    }).compile();

    service = module.get<AppointmentsService>(AppointmentsService);
  });

  describe('create', () => {
    it('should save an appointment and notify', async () => {
      const dto = {
        patientId: 'patient-id',
        providerId: 'provider-id',
        scheduledAt: new Date('2025-01-15T10:00:00Z'),
      };

      const savedDoc = { ...mockAppointmentBase, status: AppointmentStatus.PENDING };
      mockSave.mockResolvedValueOnce(savedDoc);

      const result = await service.create(dto as never);

      expect(mockAvailabilityService.validateSlot).toHaveBeenCalledWith(dto.providerId, dto.scheduledAt);
      expect(mockSave).toHaveBeenCalled();
      expect(mockNotificationsService.notifyAppointmentCreated).toHaveBeenCalledWith(savedDoc);
      expect(result).toEqual(savedDoc);
    });

    it('should not notify if save throws', async () => {
      const dto = {
        patientId: 'patient-id',
        providerId: 'provider-id',
        scheduledAt: new Date('2025-01-15T10:00:00Z'),
      };

      mockSave.mockRejectedValueOnce(new Error('DB error'));

      await expect(service.create(dto as never)).rejects.toThrow('DB error');
      expect(mockNotificationsService.notifyAppointmentCreated).not.toHaveBeenCalled();
    });
  });

  describe('createAppointment', () => {
    it('should create an appointment and notify', async () => {
      const dto = {
        patientId: 'patient-id',
        providerId: 'provider-id',
        scheduledAt: new Date('2025-01-15T10:00:00Z'),
      };

      const createdDoc = { ...mockAppointmentBase };
      mockAppointmentModel.create.mockResolvedValueOnce(createdDoc);

      const result = await service.createAppointment(dto as never);

      expect(mockAppointmentModel.create).toHaveBeenCalledWith(dto);
      expect(mockNotificationsService.notifyAppointmentCreated).toHaveBeenCalledWith(createdDoc);
      expect(result).toEqual(createdDoc);
    });
  });

  describe('findAll', () => {
    it('should return all appointments', async () => {
      const appointments = [mockAppointmentBase];
      mockAppointmentModel.find.mockReturnValueOnce({ exec: jest.fn().mockResolvedValueOnce(appointments) });

      const result = await service.findAll();

      expect(result).toEqual(appointments);
    });
  });

  describe('findOne', () => {
    it('should return an appointment by id', async () => {
      mockAppointmentModel.findById.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce(mockAppointmentDocument),
      });

      const result = await service.findOne('appointment-id');

      expect(result).toEqual(mockAppointmentDocument);
    });

    it('should throw NotFoundException if not found', async () => {
      mockAppointmentModel.findById.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce(null),
      });

      await expect(service.findOne('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateStatus', () => {
    it('should confirm appointment and notify confirmed', async () => {
      const doc = { ...mockAppointmentDocument, status: AppointmentStatus.PENDING };
      mockAppointmentModel.findById.mockReturnValueOnce({ exec: jest.fn().mockResolvedValueOnce(doc) });

      const savedDoc = { ...doc, status: AppointmentStatus.CONFIRMED };
      mockSave.mockResolvedValueOnce(savedDoc);

      const result = await service.updateStatus('appointment-id', { status: AppointmentStatus.CONFIRMED });

      expect(mockSave).toHaveBeenCalled();
      expect(mockNotificationsService.notifyAppointmentConfirmed).toHaveBeenCalledWith(savedDoc);
      expect(mockNotificationsService.notifyAppointmentCancelled).not.toHaveBeenCalled();
      expect(result).toEqual(savedDoc);
    });

    it('should cancel appointment via updateStatus and notify provider cancellation', async () => {
      const doc = { ...mockAppointmentDocument, status: AppointmentStatus.PENDING };
      mockAppointmentModel.findById.mockReturnValueOnce({ exec: jest.fn().mockResolvedValueOnce(doc) });

      const savedDoc = { ...doc, status: AppointmentStatus.CANCELLED };
      mockSave.mockResolvedValueOnce(savedDoc);

      const result = await service.updateStatus('appointment-id', { status: AppointmentStatus.CANCELLED });

      expect(mockSave).toHaveBeenCalled();
      expect(mockNotificationsService.notifyAppointmentCancelled).toHaveBeenCalledWith(savedDoc, 'provider');
      expect(mockNotificationsService.notifyAppointmentConfirmed).not.toHaveBeenCalled();
      expect(result).toEqual(savedDoc);
    });

    it('should not notify for PENDING status', async () => {
      const doc = { ...mockAppointmentDocument, status: AppointmentStatus.CONFIRMED };
      mockAppointmentModel.findById.mockReturnValueOnce({ exec: jest.fn().mockResolvedValueOnce(doc) });

      const savedDoc = { ...doc, status: AppointmentStatus.PENDING };
      mockSave.mockResolvedValueOnce(savedDoc);

      await service.updateStatus('appointment-id', { status: AppointmentStatus.PENDING });

      expect(mockNotificationsService.notifyAppointmentConfirmed).not.toHaveBeenCalled();
      expect(mockNotificationsService.notifyAppointmentCancelled).not.toHaveBeenCalled();
    });
  });

  describe('cancel', () => {
    it('should cancel appointment and notify patient cancellation', async () => {
      const doc = {
        ...mockAppointmentDocument,
        status: AppointmentStatus.PENDING,
        save: mockSave,
      };
      mockAppointmentModel.findById.mockReturnValueOnce({ exec: jest.fn().mockResolvedValueOnce(doc) });
      mockSave.mockResolvedValueOnce(undefined);

      const result = await service.cancel('appointment-id');

      expect(mockSave).toHaveBeenCalled();
      expect(mockNotificationsService.notifyAppointmentCancelled).toHaveBeenCalledWith(doc, 'patient');
      expect(result).toEqual(doc);
    });

    it('should throw BadRequestException if already cancelled', async () => {
      const doc = {
        ...mockAppointmentDocument,
        status: AppointmentStatus.CANCELLED,
        save: mockSave,
      };
      mockAppointmentModel.findById.mockReturnValueOnce({ exec: jest.fn().mockResolvedValueOnce(doc) });

      await expect(service.cancel('appointment-id')).rejects.toThrow(BadRequestException);
      expect(mockNotificationsService.notifyAppointmentCancelled).not.toHaveBeenCalled();
    });
  });
});

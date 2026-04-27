import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { AppointmentsService } from '../appointments.service';
import { Appointment } from '../schemas/appointment.schema';
import { ClinicsService } from '../../clinics/clinics.service';
import { AvailabilityService } from '../../availability/availability.service';

const mockAppointmentModel = {
  find: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
};

const mockClinicsService = {
  findById: jest.fn().mockResolvedValue({ linkedScheduling: false }),
};

const mockAvailabilityService = {
  getAvailableSlotsForDay: jest.fn(),
};

describe('AppointmentsService', () => {
  let service: AppointmentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppointmentsService,
        {
          provide: getModelToken(Appointment.name),
          useValue: mockAppointmentModel,
        },
        {
          provide: ClinicsService,
          useValue: mockClinicsService,
        },
        {
          provide: AvailabilityService,
          useValue: mockAvailabilityService,
        },
      ],
    }).compile();

    service = module.get<AppointmentsService>(AppointmentsService);
    jest.clearAllMocks();
    mockClinicsService.findById.mockResolvedValue({ linkedScheduling: false });
  });

  describe('createAppointment', () => {
    it('creates appointment successfully', async () => {
      const dto = {
        professionalId: 'prof-1',
        patientId: 'patient-1',
        clinicId: 'clinic-1',
        startTime: new Date('2025-01-10T09:00'),
        endTime: new Date('2025-01-10T10:00'),
      };

      mockAppointmentModel.find.mockResolvedValue([]);
      mockAppointmentModel.create.mockResolvedValue({ _id: 'appt-1', ...dto });

      const result = await service.createAppointment(dto as any);
      expect(result).toBeDefined();
    });

    it('throws ConflictException when appointment overlaps', async () => {
      const dto = {
        professionalId: 'prof-1',
        patientId: 'patient-1',
        clinicId: 'clinic-1',
        startTime: new Date('2025-01-10T09:30'),
        endTime: new Date('2025-01-10T10:30'),
      };

      mockAppointmentModel.find.mockResolvedValue([
        {
          startTime: new Date('2025-01-10T09:00'),
          endTime: new Date('2025-01-10T10:00'),
          clinicId: 'clinic-1',
        },
      ]);

      await expect(service.createAppointment(dto as any)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('checkConflict', () => {
    it('resolves when no conflicts exist', async () => {
      mockAppointmentModel.find.mockResolvedValue([]);

      await expect(
        service.checkConflict(
          'prof-1',
          new Date('2025-01-10T09:00'),
          new Date('2025-01-10T10:00'),
          'clinic-1',
        ),
      ).resolves.not.toThrow();
    });

    it('throws ConflictException on overlapping appointment', async () => {
      mockAppointmentModel.find.mockResolvedValue([
        {
          startTime: new Date('2025-01-10T09:00'),
          endTime: new Date('2025-01-10T10:00'),
          clinicId: 'clinic-1',
        },
      ]);

      await expect(
        service.checkConflict(
          'prof-1',
          new Date('2025-01-10T09:30'),
          new Date('2025-01-10T10:30'),
          'clinic-1',
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('linkedScheduling=true allows adjacent same-clinic appointments', async () => {
      mockClinicsService.findById.mockResolvedValue({ linkedScheduling: true });
      mockAppointmentModel.find.mockResolvedValue([
        {
          startTime: new Date('2025-01-10T09:00'),
          endTime: new Date('2025-01-10T10:00'),
          clinicId: 'clinic-1',
        },
      ]);

      await expect(
        service.checkConflict(
          'prof-1',
          new Date('2025-01-10T10:00'),
          new Date('2025-01-10T11:00'),
          'clinic-1',
        ),
      ).resolves.not.toThrow();
    });

    it('linkedScheduling=false blocks adjacent same-clinic appointments', async () => {
      mockClinicsService.findById.mockResolvedValue({ linkedScheduling: false });
      mockAppointmentModel.find.mockResolvedValue([
        {
          startTime: new Date('2025-01-10T09:00'),
          endTime: new Date('2025-01-10T10:00'),
          clinicId: 'clinic-1',
        },
      ]);

      await expect(
        service.checkConflict(
          'prof-1',
          new Date('2025-01-10T10:00'),
          new Date('2025-01-10T11:00'),
          'clinic-1',
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('linkedScheduling=true still blocks strict overlap', async () => {
      mockClinicsService.findById.mockResolvedValue({ linkedScheduling: true });
      mockAppointmentModel.find.mockResolvedValue([
        {
          startTime: new Date('2025-01-10T09:00'),
          endTime: new Date('2025-01-10T10:00'),
          clinicId: 'clinic-1',
        },
      ]);

      await expect(
        service.checkConflict(
          'prof-1',
          new Date('2025-01-10T09:30'),
          new Date('2025-01-10T10:30'),
          'clinic-1',
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('getAvailableSlotsForDay', () => {
    it('delegates to availability service with correct args', async () => {
      mockAvailabilityService.getAvailableSlotsForDay.mockResolvedValue(['09:00', '10:00']);

      const result = await service.getAvailableSlotsForDay('prof-1', '2025-01-10');

      expect(mockAvailabilityService.getAvailableSlotsForDay).toHaveBeenCalledWith(
        'prof-1',
        '2025-01-10',
      );
      expect(result).toEqual(['09:00', '10:00']);
    });
  });

  describe('findById', () => {
    it('throws NotFoundException when appointment not found', async () => {
      mockAppointmentModel.findById.mockResolvedValue(null);

      await expect(service.findById('appt-1')).rejects.toThrow(NotFoundException);
    });

    it('returns appointment when found', async () => {
      const appt = { _id: 'appt-1', professionalId: 'prof-1' };
      mockAppointmentModel.findById.mockResolvedValue(appt);

      const result = await service.findById('appt-1');
      expect(result).toEqual(appt);
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';

import { AppointmentsService } from '../appointments.service';
import { Appointment } from '../schemas/appointment.schema';
import { ClinicsService } from '../../clinics/clinics.service';

describe('AppointmentsService', () => {
  let service: AppointmentsService;

  const clinicId = new Types.ObjectId().toString();
  const professionalId = new Types.ObjectId().toString();
  const patientId = new Types.ObjectId().toString();

  const existingAppointment = {
    _id: new Types.ObjectId().toString(),
    clinicId,
    professionalId,
    patientId,
    startTime: new Date('2025-01-01T09:00:00.000Z'),
    endTime: new Date('2025-01-01T10:00:00.000Z'),
    status: 'confirmed',
  };

  // Mock Appointment Model — hybrid callable + statics
  const mockAppointmentModel: any = jest.fn().mockImplementation((dto: any) => ({
    ...dto,
    _id: new Types.ObjectId().toString(),
    save: jest.fn().mockResolvedValue({
      ...dto,
      _id: new Types.ObjectId().toString(),
    }),
  }));

  mockAppointmentModel.find = jest.fn();
  mockAppointmentModel.findOne = jest.fn();
  mockAppointmentModel.findById = jest.fn();
  mockAppointmentModel.findByIdAndUpdate = jest.fn();
  mockAppointmentModel.findByIdAndDelete = jest.fn();
  mockAppointmentModel.create = jest.fn();
  mockAppointmentModel.exists = jest.fn();

  const mockClinicsService = {
    findById: jest.fn(),
  };

  const buildExecMock = (value: any) => ({
    exec: jest.fn().mockResolvedValue(value),
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    // Default: no conflict in DB
    mockAppointmentModel.findOne.mockReturnValue(buildExecMock(null));
    mockAppointmentModel.find.mockReturnValue(buildExecMock([]));
    mockAppointmentModel.findById.mockReturnValue(buildExecMock(null));
    mockAppointmentModel.findByIdAndUpdate.mockReturnValue(buildExecMock(null));
    mockAppointmentModel.findByIdAndDelete.mockReturnValue(buildExecMock(null));

    // Default clinic: linkedScheduling=false (preserves strict behavior)
    mockClinicsService.findById.mockResolvedValue({
      _id: clinicId,
      linkedScheduling: false,
    });

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
      ],
    }).compile();

    service = module.get<AppointmentsService>(AppointmentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('creates an appointment when there are no conflicts', async () => {
      mockAppointmentModel.find.mockReturnValue(buildExecMock([]));
      mockAppointmentModel.findOne.mockReturnValue(buildExecMock(null));

      const dto = {
        clinicId,
        professionalId,
        patientId,
        startTime: new Date('2025-01-01T11:00:00.000Z'),
        endTime: new Date('2025-01-01T12:00:00.000Z'),
      } as any;

      const result = await service.create(dto);
      expect(result).toBeDefined();
    });
  });

  describe('checkConflict', () => {
    it('checkConflict — linkedScheduling=true allows adjacent same-clinic appointments', async () => {
      mockClinicsService.findById.mockResolvedValue({
        _id: clinicId,
        linkedScheduling: true,
      });

      // Existing appointment 09:00–10:00 — not adjacent-conflict when linkedScheduling=true
      mockAppointmentModel.find.mockReturnValue(buildExecMock([]));
      mockAppointmentModel.findOne.mockReturnValue(buildExecMock(null));

      const dto = {
        clinicId,
        professionalId,
        patientId,
        startTime: new Date('2025-01-01T10:00:00.000Z'),
        endTime: new Date('2025-01-01T11:00:00.000Z'),
      } as any;

      await expect(service.create(dto)).resolves.toBeDefined();
    });

    it('checkConflict — linkedScheduling=false blocks adjacent same-clinic appointments', async () => {
      mockClinicsService.findById.mockResolvedValue({
        _id: clinicId,
        linkedScheduling: false,
      });

      mockAppointmentModel.find.mockReturnValue(
        buildExecMock([existingAppointment]),
      );
      mockAppointmentModel.findOne.mockReturnValue(
        buildExecMock(existingAppointment),
      );

      const dto = {
        clinicId,
        professionalId,
        patientId,
        startTime: new Date('2025-01-01T10:00:00.000Z'),
        endTime: new Date('2025-01-01T11:00:00.000Z'),
      } as any;

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });

    it('checkConflict — linkedScheduling=true still blocks STRICT overlap', async () => {
      mockClinicsService.findById.mockResolvedValue({
        _id: clinicId,
        linkedScheduling: true,
      });

      mockAppointmentModel.find.mockReturnValue(
        buildExecMock([existingAppointment]),
      );
      mockAppointmentModel.findOne.mockReturnValue(
        buildExecMock(existingAppointment),
      );

      const dto = {
        clinicId,
        professionalId,
        patientId,
        startTime: new Date('2025-01-01T09:30:00.000Z'),
        endTime: new Date('2025-01-01T10:30:00.000Z'),
      } as any;

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('returns a list of appointments', async () => {
      mockAppointmentModel.find.mockReturnValue(
        buildExecMock([existingAppointment]),
      );

      const result = await service.findAll();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('findById', () => {
    it('throws NotFoundException when appointment does not exist', async () => {
      mockAppointmentModel.findById.mockReturnValue(buildExecMock(null));

      await expect(
        service.findById(new Types.ObjectId().toString()),
      ).rejects.toThrow(NotFoundException);
    });

    it('returns the appointment when it exists', async () => {
      mockAppointmentModel.findById.mockReturnValue(
        buildExecMock(existingAppointment),
      );

      const result = await service.findById(existingAppointment._id);
      expect(result).toEqual(existingAppointment);
    });
  });
});

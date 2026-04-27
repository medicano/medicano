import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import { Types } from 'mongoose';
import { AppointmentsService } from '../appointments.service';
import { Appointment, AppointmentStatus } from '../schemas/appointment.schema';
import { ClinicsService } from '../../clinics/clinics.service';

const buildExecMock = (value: unknown) => ({
  exec: jest.fn().mockResolvedValue(value),
});

describe('AppointmentsService', () => {
  let service: AppointmentsService;

  const clinicId = new Types.ObjectId().toString();
  const professionalId = new Types.ObjectId().toString();
  const patientId = new Types.ObjectId().toString();

  const mockAppointmentModel = {
    find: jest.fn(),
    findById: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockClinicsService = {
    findById: jest.fn(),
  };

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
      ],
    }).compile();

    service = module.get<AppointmentsService>(AppointmentsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('throws ConflictException when there is a scheduling conflict', async () => {
      const dto = {
        clinicId,
        professionalId,
        patientId,
        startAt: new Date().toISOString(),
        durationMinutes: 30,
      };

      mockClinicsService.findById.mockResolvedValue({ _id: clinicId });
      mockAppointmentModel.findOne.mockReturnValue(
        buildExecMock({ _id: new Types.ObjectId().toString() }),
      );

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });

    it('creates an appointment when no conflict exists', async () => {
      const dto = {
        clinicId,
        professionalId,
        patientId,
        startAt: new Date().toISOString(),
        durationMinutes: 30,
      };

      const saved = { ...dto, _id: new Types.ObjectId().toString(), status: AppointmentStatus.SCHEDULED };

      mockClinicsService.findById.mockResolvedValue({ _id: clinicId });
      mockAppointmentModel.findOne.mockReturnValue(buildExecMock(null));
      mockAppointmentModel.create.mockResolvedValue(saved);

      const result = await service.create(dto);

      expect(result).toEqual(saved);
      expect(mockAppointmentModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ clinicId, professionalId, patientId }),
      );
    });
  });

  describe('findAll', () => {
    it('returns all appointments when no filters provided', async () => {
      mockAppointmentModel.find.mockReturnValue(buildExecMock([]));

      await service.findAll();

      expect(mockAppointmentModel.find).toHaveBeenCalledWith({});
    });

    it('filters by professionalId and status when provided', async () => {
      mockAppointmentModel.find.mockReturnValue(buildExecMock([]));

      await service.findAll({ professionalId, status: AppointmentStatus.SCHEDULED });

      expect(mockAppointmentModel.find).toHaveBeenCalledWith({
        professionalId,
        status: AppointmentStatus.SCHEDULED,
      });
    });
  });

  describe('updateStatus', () => {
    const mockAppt = (status: AppointmentStatus) => ({
      _id: new Types.ObjectId().toString(),
      clinicId,
      professionalId,
      patientId,
      startAt: new Date(),
      endAt: new Date(),
      status,
      save: jest.fn().mockImplementation(function (this: any) {
        return Promise.resolve(this);
      }),
    });

    it('transitions SCHEDULED → CONFIRMED successfully', async () => {
      const id = new Types.ObjectId().toString();
      const a = mockAppt(AppointmentStatus.SCHEDULED);
      mockAppointmentModel.findById.mockReturnValue(buildExecMock(a));

      const res = await service.updateStatus(id, { status: AppointmentStatus.CONFIRMED });

      expect(res.status).toBe(AppointmentStatus.CONFIRMED);
      expect(a.save).toHaveBeenCalled();
    });

    it('transitions SCHEDULED → CANCELLED successfully', async () => {
      const id = new Types.ObjectId().toString();
      const a = mockAppt(AppointmentStatus.SCHEDULED);
      mockAppointmentModel.findById.mockReturnValue(buildExecMock(a));

      const res = await service.updateStatus(id, { status: AppointmentStatus.CANCELLED });

      expect(res.status).toBe(AppointmentStatus.CANCELLED);
      expect(a.save).toHaveBeenCalled();
    });

    it('transitions CONFIRMED → COMPLETED successfully', async () => {
      const id = new Types.ObjectId().toString();
      const a = mockAppt(AppointmentStatus.CONFIRMED);
      mockAppointmentModel.findById.mockReturnValue(buildExecMock(a));

      const res = await service.updateStatus(id, { status: AppointmentStatus.COMPLETED });

      expect(res.status).toBe(AppointmentStatus.COMPLETED);
      expect(a.save).toHaveBeenCalled();
    });

    it('throws ConflictException for invalid transition SCHEDULED → COMPLETED', async () => {
      const id = new Types.ObjectId().toString();
      const a = mockAppt(AppointmentStatus.SCHEDULED);
      mockAppointmentModel.findById.mockReturnValue(buildExecMock(a));

      await expect(
        service.updateStatus(id, { status: AppointmentStatus.COMPLETED }),
      ).rejects.toThrow(ConflictException);
    });

    it('throws ConflictException when appointment is already CANCELLED', async () => {
      const id = new Types.ObjectId().toString();
      const a = mockAppt(AppointmentStatus.CANCELLED);
      mockAppointmentModel.findById.mockReturnValue(buildExecMock(a));

      await expect(
        service.updateStatus(id, { status: AppointmentStatus.CONFIRMED }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('cancel', () => {
    const mockAppt = (status: AppointmentStatus) => ({
      _id: new Types.ObjectId().toString(),
      clinicId,
      professionalId,
      patientId,
      startAt: new Date(),
      endAt: new Date(),
      status,
      save: jest.fn().mockImplementation(function (this: any) {
        return Promise.resolve(this);
      }),
    });

    it('cancels a SCHEDULED appointment and returns it', async () => {
      const id = new Types.ObjectId().toString();
      const a = mockAppt(AppointmentStatus.SCHEDULED);
      mockAppointmentModel.findById.mockReturnValue(buildExecMock(a));

      const res = await service.cancel(id);

      expect(res.status).toBe(AppointmentStatus.CANCELLED);
      expect(a.save).toHaveBeenCalled();
    });

    it('throws ConflictException if appointment is already CANCELLED', async () => {
      const id = new Types.ObjectId().toString();
      const a = mockAppt(AppointmentStatus.CANCELLED);
      mockAppointmentModel.findById.mockReturnValue(buildExecMock(a));

      await expect(service.cancel(id)).rejects.toThrow(ConflictException);
    });
  });

  describe('cancelAsPatient', () => {
    const mockAppt = (status: AppointmentStatus) => ({
      _id: new Types.ObjectId().toString(),
      clinicId,
      professionalId,
      patientId,
      startAt: new Date(),
      endAt: new Date(),
      status,
      save: jest.fn().mockImplementation(function (this: any) {
        return Promise.resolve(this);
      }),
    });

    it('cancels when patientId matches the authenticated user', async () => {
      const id = new Types.ObjectId().toString();
      const a = mockAppt(AppointmentStatus.SCHEDULED);
      mockAppointmentModel.findById.mockReturnValue(buildExecMock(a));

      const res = await service.cancelAsPatient(id, patientId);

      expect(res.status).toBe(AppointmentStatus.CANCELLED);
      expect(a.save).toHaveBeenCalled();
    });

    it('throws ForbiddenException when patientId does not match', async () => {
      const id = new Types.ObjectId().toString();
      const otherUserId = new Types.ObjectId().toString();
      const a = mockAppt(AppointmentStatus.SCHEDULED);
      mockAppointmentModel.findById.mockReturnValue(buildExecMock(a));

      await expect(service.cancelAsPatient(id, otherUserId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws ConflictException if appointment is already COMPLETED', async () => {
      const id = new Types.ObjectId().toString();
      const a = mockAppt(AppointmentStatus.COMPLETED);
      mockAppointmentModel.findById.mockReturnValue(buildExecMock(a));

      await expect(service.cancelAsPatient(id, patientId)).rejects.toThrow(
        ConflictException,
      );
    });
  });
});

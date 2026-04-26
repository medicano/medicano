import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConflictException } from '@nestjs/common';
import { AppointmentsService } from '../appointments.service';
import {
  Appointment,
  AppointmentStatus,
} from '../schemas/appointment.schema';
import { ClinicsService } from '../../clinics/clinics.service';

describe('AppointmentsService', () => {
  let service: AppointmentsService;
  let appointmentModel: any;
  let clinicsService: { findById: jest.Mock };

  const clinicId = 'clinic-1';
  const professionalId = 'prof-1';
  const patientId = 'patient-1';

  const makeModelMock = () => {
    const saveMock = jest.fn().mockResolvedValue({ _id: 'new-id' });
    const ctor: any = jest.fn().mockImplementation((doc: any) => ({
      ...doc,
      save: saveMock,
    }));
    ctor.findOne = jest.fn();
    ctor.find = jest.fn();
    ctor.findById = jest.fn();
    ctor.findByIdAndDelete = jest.fn();
    ctor.__saveMock = saveMock;
    return ctor;
  };

  beforeEach(async () => {
    appointmentModel = makeModelMock();
    clinicsService = { findById: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppointmentsService,
        { provide: getModelToken(Appointment.name), useValue: appointmentModel },
        { provide: ClinicsService, useValue: clinicsService },
      ],
    }).compile();

    service = module.get<AppointmentsService>(AppointmentsService);
  });

  const baseDto = () => ({
    professionalId,
    clinicId,
    patientId,
    startAt: new Date('2025-01-01T10:30:00.000Z').toISOString(),
    endAt: new Date('2025-01-01T11:00:00.000Z').toISOString(),
  });

  describe('checkConflict via create()', () => {
    it('throws conflict when linkedScheduling=true and appointments strictly overlap', async () => {
      clinicsService.findById.mockResolvedValue({
        _id: clinicId,
        linkedScheduling: true,
      });
      appointmentModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: 'existing' }),
      });

      await expect(service.create(baseDto() as any)).rejects.toThrow(
        ConflictException,
      );

      const query = appointmentModel.findOne.mock.calls[0][0];
      expect(query.professionalId).toBe(professionalId);
      expect(query.clinicId).toBe(clinicId);
      expect(query.status).toEqual({
        $nin: [AppointmentStatus.CANCELLED],
      });
      expect(query.startAt).toEqual({ $lt: new Date(baseDto().endAt) });
      expect(query.endAt).toEqual({ $gt: new Date(baseDto().startAt) });
    });

    it('does not throw when linkedScheduling=true and boundary touches', async () => {
      clinicsService.findById.mockResolvedValue({
        _id: clinicId,
        linkedScheduling: true,
      });
      appointmentModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.create(baseDto() as any)).resolves.toBeDefined();
    });

    it('throws conflict when linkedScheduling=false and boundary touches', async () => {
      clinicsService.findById.mockResolvedValue({
        _id: clinicId,
        linkedScheduling: false,
      });
      appointmentModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: 'existing' }),
      });

      await expect(service.create(baseDto() as any)).rejects.toThrow(
        ConflictException,
      );

      const query = appointmentModel.findOne.mock.calls[0][0];
      expect(query.startAt).toEqual({ $lte: new Date(baseDto().endAt) });
      expect(query.endAt).toEqual({ $gte: new Date(baseDto().startAt) });
    });

    it('defaults linkedScheduling to false when clinic has no value set', async () => {
      clinicsService.findById.mockResolvedValue({ _id: clinicId });
      appointmentModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: 'existing' }),
      });

      await expect(service.create(baseDto() as any)).rejects.toThrow(
        ConflictException,
      );

      const query = appointmentModel.findOne.mock.calls[0][0];
      expect(query.startAt).toEqual({ $lte: new Date(baseDto().endAt) });
      expect(query.endAt).toEqual({ $gte: new Date(baseDto().startAt) });
    });

    it('filters out cancelled appointments', async () => {
      clinicsService.findById.mockResolvedValue({
        _id: clinicId,
        linkedScheduling: true,
      });
      appointmentModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await service.create(baseDto() as any);

      const query = appointmentModel.findOne.mock.calls[0][0];
      expect(query.status).toEqual({
        $nin: [AppointmentStatus.CANCELLED],
      });
    });

    it('restricts conflict query to the same clinic', async () => {
      clinicsService.findById.mockResolvedValue({
        _id: clinicId,
        linkedScheduling: false,
      });
      appointmentModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await service.create(baseDto() as any);

      const query = appointmentModel.findOne.mock.calls[0][0];
      expect(query.clinicId).toBe(clinicId);
    });
  });

  describe('checkConflict via update()', () => {
    it('excludes current appointment id from conflict query', async () => {
      const existing: any = {
        _id: { toString: () => 'appt-1' },
        professionalId,
        clinicId,
        startAt: new Date('2025-01-01T10:30:00.000Z'),
        endAt: new Date('2025-01-01T11:00:00.000Z'),
        save: jest.fn().mockResolvedValue(true),
      };

      appointmentModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(existing),
      });
      clinicsService.findById.mockResolvedValue({
        _id: clinicId,
        linkedScheduling: true,
      });
      appointmentModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await service.update('appt-1', {
        startAt: new Date('2025-01-01T10:30:00.000Z').toISOString(),
        endAt: new Date('2025-01-01T11:00:00.000Z').toISOString(),
      } as any);

      const query = appointmentModel.findOne.mock.calls[0][0];
      expect(query._id).toEqual({ $ne: 'appt-1' });
      expect(query.clinicId).toBe(clinicId);
    });
  });

  describe('createForPatient()', () => {
    it('runs both same-clinic conflict and cross-clinic interval checks', async () => {
      clinicsService.findById.mockResolvedValue({
        _id: clinicId,
        linkedScheduling: true,
      });

      const findOneMock = jest
        .fn()
        .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(null) })
        .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(null) });
      appointmentModel.findOne = findOneMock;

      await service.createForPatient(baseDto() as any);

      expect(findOneMock).toHaveBeenCalledTimes(2);

      const sameClinic = findOneMock.mock.calls[0][0];
      expect(sameClinic.clinicId).toBe(clinicId);

      const crossClinic = findOneMock.mock.calls[1][0];
      expect(crossClinic.patientId).toBe(patientId);
      expect(crossClinic.clinicId).toEqual({ $ne: clinicId });
    });

    it('throws ConflictException when cross-clinic interval is violated', async () => {
      clinicsService.findById.mockResolvedValue({
        _id: clinicId,
        linkedScheduling: true,
      });

      const findOneMock = jest
        .fn()
        .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(null) })
        .mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue({ _id: 'cross' }),
        });
      appointmentModel.findOne = findOneMock;

      await expect(
        service.createForPatient(baseDto() as any),
      ).rejects.toThrow(ConflictException);
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';

import { ClinicUnitsService } from '../services/clinic-units.service';
import { ClinicsService } from '../clinics.service';
import { Clinic } from '../schemas/clinic.schema';

// Fake mínimo de um array de subdocumentos Mongoose: só o suficiente para
// exercitar o código de ClinicUnitsService (push/id/deleteOne).
function makeFakeUnitsArray(initial: any[] = []) {
  const arr: any[] = [...initial];
  (arr as any).id = (id: string) => arr.find((u) => String(u._id) === String(id)) ?? null;
  return arr;
}

describe('ClinicUnitsService', () => {
  let service: ClinicUnitsService;
  let clinicsService: any;
  let clinicModel: any;

  const clinicId = new Types.ObjectId().toHexString();
  const ownerId = new Types.ObjectId().toHexString();

  let fakeClinic: any;

  beforeEach(async () => {
    fakeClinic = {
      userId: new Types.ObjectId(ownerId),
      units: makeFakeUnitsArray(),
      save: jest.fn().mockResolvedValue(undefined),
    };

    clinicsService = {
      findOne: jest.fn().mockResolvedValue(fakeClinic),
    };
    clinicModel = {};

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClinicUnitsService,
        { provide: getModelToken(Clinic.name), useValue: clinicModel },
        { provide: ClinicsService, useValue: clinicsService },
      ],
    }).compile();

    service = module.get<ClinicUnitsService>(ClinicUnitsService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('addUnit', () => {
    const dto = { name: 'Unidade Centro', addressForm: { city: 'Campinas' } } as any;

    it('pushes the new unit and saves the clinic', async () => {
      const result = await service.addUnit(clinicId, ownerId, dto);

      expect(fakeClinic.units).toHaveLength(1);
      expect(fakeClinic.units[0]).toEqual(
        expect.objectContaining({ name: 'Unidade Centro', isActive: true }),
      );
      expect(fakeClinic.save).toHaveBeenCalled();
      expect(result).toBe(fakeClinic.units);
    });

    it('throws ForbiddenException when the caller does not own the clinic', async () => {
      clinicsService.findOne.mockResolvedValue({
        ...fakeClinic,
        userId: new Types.ObjectId(),
      });

      await expect(service.addUnit(clinicId, ownerId, dto)).rejects.toThrow(ForbiddenException);
      expect(fakeClinic.save).not.toHaveBeenCalled();
    });

    it('rejects overlapping weeklySlots for the unit', async () => {
      const overlapping = {
        ...dto,
        weeklySlots: [
          { dayOfWeek: 1, startTime: '08:00', endTime: '12:00', slotDurationMinutes: 30 },
          { dayOfWeek: 1, startTime: '11:00', endTime: '14:00', slotDurationMinutes: 30 },
        ],
      };

      await expect(service.addUnit(clinicId, ownerId, overlapping)).rejects.toThrow();
    });
  });

  describe('updateUnit', () => {
    it('updates the fields of an existing unit', async () => {
      const unitId = new Types.ObjectId().toHexString();
      fakeClinic.units = makeFakeUnitsArray([
        { _id: unitId, name: 'Unidade Antiga', isActive: true },
      ]);

      const result = await service.updateUnit(clinicId, unitId, ownerId, {
        name: 'Unidade Nova',
        isActive: false,
      });

      expect(result[0].name).toBe('Unidade Nova');
      expect(result[0].isActive).toBe(false);
      expect(fakeClinic.save).toHaveBeenCalled();
    });

    it('throws NotFoundException when the unit does not exist', async () => {
      fakeClinic.units = makeFakeUnitsArray([]);

      await expect(
        service.updateUnit(clinicId, new Types.ObjectId().toHexString(), ownerId, {
          name: 'X',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects an invalid unit id without touching the database', async () => {
      await expect(
        service.updateUnit(clinicId, 'not-an-id', ownerId, { name: 'X' }),
      ).rejects.toThrow(NotFoundException);
      expect(clinicsService.findOne).not.toHaveBeenCalled();
    });
  });

  describe('removeUnit', () => {
    it('removes the unit and saves the clinic', async () => {
      const unitId = new Types.ObjectId().toHexString();
      const unit = { _id: unitId, name: 'Unidade X', deleteOne: jest.fn() };
      fakeClinic.units = makeFakeUnitsArray([unit]);

      await service.removeUnit(clinicId, unitId, ownerId);

      expect(unit.deleteOne).toHaveBeenCalled();
      expect(fakeClinic.save).toHaveBeenCalled();
    });
  });
});

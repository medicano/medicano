import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ForbiddenException } from '@nestjs/common';
import { Types } from 'mongoose';

import { ClinicHealthInsurancesService } from '../services/clinic-health-insurances.service';
import { ClinicsService } from '../clinics.service';
import { Clinic } from '../schemas/clinic.schema';

describe('ClinicHealthInsurancesService', () => {
  let service: ClinicHealthInsurancesService;
  let clinicsService: any;
  let fakeClinic: any;

  const clinicId = new Types.ObjectId().toHexString();
  const ownerId = new Types.ObjectId().toHexString();

  beforeEach(async () => {
    fakeClinic = {
      userId: new Types.ObjectId(ownerId),
      healthInsurances: [] as string[],
      save: jest.fn().mockResolvedValue(undefined),
    };
    clinicsService = { findOne: jest.fn().mockResolvedValue(fakeClinic) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClinicHealthInsurancesService,
        { provide: getModelToken(Clinic.name), useValue: {} },
        { provide: ClinicsService, useValue: clinicsService },
      ],
    }).compile();

    service = module.get<ClinicHealthInsurancesService>(ClinicHealthInsurancesService);
  });

  afterEach(() => jest.clearAllMocks());

  it('replaces the healthInsurances field and saves the clinic', async () => {
    const result = await service.update(clinicId, ownerId, ['Unimed', 'Bradesco Saúde']);

    expect(fakeClinic.healthInsurances).toEqual(['Unimed', 'Bradesco Saúde']);
    expect(fakeClinic.save).toHaveBeenCalled();
    expect(result).toEqual(['Unimed', 'Bradesco Saúde']);
  });

  it('throws ForbiddenException for a non-owner and does not save', async () => {
    clinicsService.findOne.mockResolvedValue({ ...fakeClinic, userId: new Types.ObjectId() });

    await expect(service.update(clinicId, ownerId, ['Unimed'])).rejects.toThrow(
      ForbiddenException,
    );
    expect(fakeClinic.save).not.toHaveBeenCalled();
  });

  it('accepts an empty array to clear all health insurances', async () => {
    fakeClinic.healthInsurances = ['Unimed'];

    const result = await service.update(clinicId, ownerId, []);

    expect(result).toEqual([]);
  });
});

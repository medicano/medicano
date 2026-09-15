import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';

import { ClinicPhotosService } from '../services/clinic-photos.service';
import { ClinicsService } from '../clinics.service';
import { Clinic } from '../schemas/clinic.schema';

describe('ClinicPhotosService', () => {
  let service: ClinicPhotosService;
  let clinicsService: any;
  let fakeClinic: any;

  const clinicId = new Types.ObjectId().toHexString();
  const ownerId = new Types.ObjectId().toHexString();

  beforeEach(async () => {
    fakeClinic = {
      userId: new Types.ObjectId(ownerId),
      photos: [] as string[],
      save: jest.fn().mockResolvedValue(undefined),
    };
    clinicsService = { findOne: jest.fn().mockResolvedValue(fakeClinic) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClinicPhotosService,
        { provide: getModelToken(Clinic.name), useValue: {} },
        { provide: ClinicsService, useValue: clinicsService },
      ],
    }).compile();

    service = module.get<ClinicPhotosService>(ClinicPhotosService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('addPhoto', () => {
    it('appends the public path and saves the clinic', async () => {
      const result = await service.addPhoto(clinicId, ownerId, '/uploads/clinics/x/a.jpg');

      expect(fakeClinic.photos).toEqual(['/uploads/clinics/x/a.jpg']);
      expect(fakeClinic.save).toHaveBeenCalled();
      expect(result).toBe(fakeClinic.photos);
    });

    it('throws ForbiddenException for a non-owner', async () => {
      clinicsService.findOne.mockResolvedValue({ ...fakeClinic, userId: new Types.ObjectId() });

      await expect(
        service.addPhoto(clinicId, ownerId, '/uploads/clinics/x/a.jpg'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException once the photo limit is reached', async () => {
      fakeClinic.photos = Array.from({ length: 12 }, (_, i) => `/uploads/clinics/x/${i}.jpg`);

      await expect(
        service.addPhoto(clinicId, ownerId, '/uploads/clinics/x/new.jpg'),
      ).rejects.toThrow(BadRequestException);
      expect(fakeClinic.save).not.toHaveBeenCalled();
    });
  });

  describe('removePhoto', () => {
    it('removes the path from the array and saves the clinic', async () => {
      fakeClinic.photos = ['/uploads/clinics/x/a.jpg', '/uploads/clinics/x/b.jpg'];

      const result = await service.removePhoto(clinicId, ownerId, '/uploads/clinics/x/a.jpg');

      expect(result).toEqual(['/uploads/clinics/x/b.jpg']);
      expect(fakeClinic.save).toHaveBeenCalled();
    });

    it('throws NotFoundException when the path is not in the photos array', async () => {
      fakeClinic.photos = ['/uploads/clinics/x/a.jpg'];

      await expect(
        service.removePhoto(clinicId, ownerId, '/uploads/clinics/x/does-not-exist.jpg'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});

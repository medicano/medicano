import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AvailabilityService } from '../availability.service';
import { Availability } from '../schemas/availability.schema';

const mockAvailabilityModel = {
  findOne: jest.fn(),
  create: jest.fn(),
  findOneAndUpdate: jest.fn(),
  findOneAndDelete: jest.fn(),
};

describe('AvailabilityService', () => {
  let service: AvailabilityService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AvailabilityService,
        {
          provide: getModelToken(Availability.name),
          useValue: mockAvailabilityModel,
        },
      ],
    }).compile();

    service = module.get<AvailabilityService>(AvailabilityService);
    jest.clearAllMocks();
  });

  describe('setAvailability', () => {
    it('creates availability for professional', async () => {
      const dto = {
        professionalId: 'prof-1',
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '17:00',
        slotDuration: 30,
      };
      mockAvailabilityModel.findOneAndUpdate.mockResolvedValue({ _id: 'avail-1', ...dto });

      const result = await service.setAvailability('prof-1', dto as any);
      expect(result).toBeDefined();
    });
  });

  describe('getAvailableSlotsForDay', () => {
    it('returns available slots for a given day', async () => {
      mockAvailabilityModel.findOne.mockResolvedValue({
        professionalId: 'prof-1',
        dayOfWeek: 5,
        startTime: '09:00',
        endTime: '11:00',
        slotDuration: 60,
      });

      const result = await service.getAvailableSlotsForDay('prof-1', '2025-01-10');
      expect(Array.isArray(result)).toBe(true);
    });

    it('returns empty array when no availability configured', async () => {
      mockAvailabilityModel.findOne.mockResolvedValue(null);

      const result = await service.getAvailableSlotsForDay('prof-1', '2025-01-10');
      expect(result).toEqual([]);
    });
  });

  describe('getAvailableSlots', () => {
    it('returns slots for a date range', async () => {
      mockAvailabilityModel.findOne.mockResolvedValue({
        professionalId: 'prof-1',
        dayOfWeek: 5,
        startTime: '09:00',
        endTime: '11:00',
        slotDuration: 60,
      });

      const result = await service.getAvailableSlots('prof-1', '2025-01-10', '2025-01-12');
      expect(result).toBeDefined();
    });

    it('fromDate > toDate throws BadRequestException', async () => {
      await expect(
        service.getAvailableSlots('prof-1', '2025-02-10', '2025-02-01'),
      ).rejects.toThrow(BadRequestException);
    });

    it('range > 30 days throws BadRequestException', async () => {
      await expect(
        service.getAvailableSlots('prof-1', '2025-01-01', '2025-02-15'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});

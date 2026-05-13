import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException } from '@nestjs/common';
import { AvailabilityService } from '../availability.service';
import { Appointment } from '../../appointments/schemas/appointment.schema';
import { Professional } from '../../professionals/schemas/professional.schema';

const mockAppointmentModel = {
  find: jest.fn(),
};

const mockProfessionalModel = {
  findById: jest.fn(),
};

const professionalWithFridaySlots = {
  weeklySlots: [{ dayOfWeek: 5, startTime: '09:00', endTime: '11:00' }],
};

describe('AvailabilityService', () => {
  let service: AvailabilityService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AvailabilityService,
        {
          provide: getModelToken(Appointment.name),
          useValue: mockAppointmentModel,
        },
        {
          provide: getModelToken(Professional.name),
          useValue: mockProfessionalModel,
        },
      ],
    }).compile();

    service = module.get<AvailabilityService>(AvailabilityService);
    jest.clearAllMocks();
  });

  describe('getAvailableSlotsForDay', () => {
    it('returns available slots for a given day', async () => {
      mockProfessionalModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(professionalWithFridaySlots),
      });
      mockAppointmentModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      });

      const result = await service.getAvailableSlotsForDay('prof-1', '2025-01-10');
      expect(Array.isArray(result)).toBe(true);
    });

    it('returns empty array when no availability configured', async () => {
      mockProfessionalModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.getAvailableSlotsForDay('prof-1', '2025-01-10');
      expect(result).toEqual([]);
    });
  });

  describe('getAvailableSlots', () => {
    it('returns slots for a date range', async () => {
      mockProfessionalModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(professionalWithFridaySlots),
      });
      mockAppointmentModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
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

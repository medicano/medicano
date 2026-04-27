import { Test, TestingModule } from '@nestjs/testing';
import { ScheduleService } from '../services/schedule.service';
import { AvailabilityService } from '../availability.service';

const mockAvailabilityService = {
  getAvailableSlots: jest.fn(),
  getAvailableSlotsForDay: jest.fn(),
};

describe('ScheduleService', () => {
  let service: ScheduleService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScheduleService,
        {
          provide: AvailabilityService,
          useValue: mockAvailabilityService,
        },
      ],
    }).compile();

    service = module.get<ScheduleService>(ScheduleService);
    jest.clearAllMocks();
  });

  describe('getScheduleForRange', () => {
    it('delegates to availability service with fromDate and toDate', async () => {
      const professionalId = 'prof-1';
      const fromDate = '2025-01-10';
      const toDate = '2025-01-20';

      mockAvailabilityService.getAvailableSlots.mockResolvedValue({
        '2025-01-10': ['09:00', '10:00'],
        '2025-01-11': ['09:00'],
      });

      await service.getScheduleForRange(professionalId, fromDate, toDate);

      expect(mockAvailabilityService.getAvailableSlots).toHaveBeenCalledWith(
        professionalId,
        fromDate,
        toDate,
      );
    });

    it('returns schedule map from availability service', async () => {
      const expectedSchedule = {
        '2025-01-10': ['09:00', '10:00'],
      };
      mockAvailabilityService.getAvailableSlots.mockResolvedValue(expectedSchedule);

      const result = await service.getScheduleForRange('prof-1', '2025-01-10', '2025-01-20');
      expect(result).toEqual(expectedSchedule);
    });

    it('calls availability with correct argument types', async () => {
      mockAvailabilityService.getAvailableSlots.mockResolvedValue({});

      await service.getScheduleForRange('prof-1', '2025-01-10', '2025-01-20');

      expect(mockAvailabilityService.getAvailableSlots).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(String),
      );
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { SearchService } from '../search.service';
import { Professional } from '../../professionals/schemas/professional.schema';
import { Clinic } from '../../clinics/schemas/clinic.schema';
import { SubscriptionsService } from '../../subscriptions/subscriptions.service';

const mockProfessionalModel = {
  find: jest.fn().mockReturnValue({
    lean: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue([]),
    }),
  }),
};

const mockClinicModel = {
  find: jest.fn().mockReturnValue({
    lean: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue([]),
    }),
  }),
};

const mockSubscriptionsService = {
  findActiveOwnerIds: jest.fn().mockResolvedValue([]),
};

describe('SearchService', () => {
  let service: SearchService;
  let professionalModel: Model<Professional>;
  let clinicModel: Model<Clinic>;
  let subscriptionsService: SubscriptionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        {
          provide: getModelToken(Professional.name),
          useValue: mockProfessionalModel,
        },
        {
          provide: getModelToken(Clinic.name),
          useValue: mockClinicModel,
        },
        {
          provide: SubscriptionsService,
          useValue: mockSubscriptionsService,
        },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
    professionalModel = module.get<Model<Professional>>(
      getModelToken(Professional.name),
    );
    clinicModel = module.get<Model<Clinic>>(getModelToken(Clinic.name));
    subscriptionsService = module.get<SubscriptionsService>(SubscriptionsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('search()', () => {
    it('should return an empty array when no results found', async () => {
      mockProfessionalModel.find.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([]),
        }),
      });
      mockClinicModel.find.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([]),
        }),
      });
      mockSubscriptionsService.findActiveOwnerIds.mockResolvedValue([]);

      const results = await service.search({});
      expect(results).toEqual([]);
    });

    it('should call findActiveOwnerIds when searching for professionals', async () => {
      mockProfessionalModel.find.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([]),
        }),
      });
      mockSubscriptionsService.findActiveOwnerIds.mockResolvedValue([]);

      await service.search({ type: 'professional' });

      expect(subscriptionsService.findActiveOwnerIds).toHaveBeenCalledWith(
        'professional',
      );
    });

    it('should NOT call findActiveOwnerIds when searching only for clinics', async () => {
      mockClinicModel.find.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([]),
        }),
      });

      await service.search({ type: 'clinic' });

      expect(subscriptionsService.findActiveOwnerIds).not.toHaveBeenCalled();
    });

    it('should filter professionals by active subscription IDs (RN20)', async () => {
      const activeId = new Types.ObjectId();
      const activeProfessional = {
        _id: activeId,
        name: 'Dr. Active',
        specialty: 'Cardiology',
        address: 'Main St',
      };

      mockSubscriptionsService.findActiveOwnerIds.mockResolvedValue([activeId]);
      mockProfessionalModel.find.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([activeProfessional]),
        }),
      });

      const results = await service.search({ type: 'professional' });

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Dr. Active');
      expect(results[0].type).toBe('professional');

      expect(mockProfessionalModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          _id: { $in: [activeId] },
        }),
      );
    });

    it('should exclude professionals without active subscription when activeProfIds is empty', async () => {
      mockSubscriptionsService.findActiveOwnerIds.mockResolvedValue([]);
      mockProfessionalModel.find.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([]),
        }),
      });

      const results = await service.search({ type: 'professional' });

      expect(results).toHaveLength(0);
      expect(mockProfessionalModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          _id: { $in: [] },
        }),
      );
    });

    it('should return clinic results without subscription filter', async () => {
      const clinicId = new Types.ObjectId();
      const mockClinic = {
        _id: clinicId,
        name: 'Health Clinic',
        address: '123 Health Ave',
      };

      mockClinicModel.find.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([mockClinic]),
        }),
      });

      const results = await service.search({ type: 'clinic' });

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Health Clinic');
      expect(results[0].type).toBe('clinic');
      expect(subscriptionsService.findActiveOwnerIds).not.toHaveBeenCalled();
    });

    it('should apply RN20 filter to professionals when type is undefined (search both)', async () => {
      const activeId = new Types.ObjectId();
      mockSubscriptionsService.findActiveOwnerIds.mockResolvedValue([activeId]);

      mockProfessionalModel.find.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([]),
        }),
      });
      mockClinicModel.find.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([]),
        }),
      });

      await service.search({});

      expect(subscriptionsService.findActiveOwnerIds).toHaveBeenCalledWith(
        'professional',
      );
      expect(mockProfessionalModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          _id: { $in: [activeId] },
        }),
      );
    });

    it('should apply name filter to professionals', async () => {
      mockSubscriptionsService.findActiveOwnerIds.mockResolvedValue([]);
      mockProfessionalModel.find.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([]),
        }),
      });

      await service.search({ type: 'professional', name: 'John' });

      expect(mockProfessionalModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          name: { $regex: 'John', $options: 'i' },
        }),
      );
    });

    it('should apply name filter to clinics', async () => {
      mockClinicModel.find.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([]),
        }),
      });

      await service.search({ type: 'clinic', name: 'Health' });

      expect(mockClinicModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          name: { $regex: 'Health', $options: 'i' },
        }),
      );
    });
  });
});

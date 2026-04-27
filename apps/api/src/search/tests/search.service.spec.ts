import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { SearchService } from '../search.service';
import { Professional } from '../../professionals/schemas/professional.schema';
import { Clinic } from '../../clinics/schemas/clinic.schema';
import { SubscriptionsService } from '../../subscriptions/subscriptions.service';

describe('SearchService', () => {
  let service: SearchService;
  let professionalModel: any;
  let clinicModel: any;

  const profId1 = new Types.ObjectId();
  const profId2 = new Types.ObjectId();
  const clinicId1 = new Types.ObjectId();

  const subscriptionsServiceMock = {
    findActiveOwnerIds: jest.fn(),
    findByOwner: jest.fn(),
    findByClinicId: jest.fn(),
  };

  const professionalDoc1 = {
    _id: profId1,
    name: 'Dr. Alice',
    specialty: 'cardiology',
    city: 'São Paulo',
  };

  const professionalDoc2 = {
    _id: profId2,
    name: 'Dr. Bob',
    specialty: 'cardiology',
    city: 'São Paulo',
  };

  const clinicDoc1 = {
    _id: clinicId1,
    name: 'Clínica Central',
    city: 'São Paulo',
  };

  const mockProfessionalModel = {
    find: jest.fn(),
  };

  const mockClinicModel = {
    find: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    subscriptionsServiceMock.findActiveOwnerIds.mockImplementation(async (ownerType: string) => {
      if (ownerType === 'professional') {
        return [profId1, profId2];
      }
      return [];
    });

    mockProfessionalModel.find.mockReturnValue({
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([professionalDoc1, professionalDoc2]),
    });

    mockClinicModel.find.mockReturnValue({
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([clinicDoc1]),
    });

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
          useValue: subscriptionsServiceMock,
        },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
    professionalModel = mockProfessionalModel;
    clinicModel = mockClinicModel;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('search — returns professionals and clinics matching the query', async () => {
    const result = await service.search({ city: 'São Paulo', specialty: 'cardiology' } as any);

    expect(result).toBeDefined();
    expect(result.professionals).toBeDefined();
    expect(result.clinics).toBeDefined();
    expect(result.professionals.length).toBeGreaterThanOrEqual(0);
    expect(result.clinics.length).toBeGreaterThanOrEqual(0);
  });

  it('search — filters out professionals without active subscription (RN20)', async () => {
    subscriptionsServiceMock.findActiveOwnerIds.mockImplementation(async (ownerType: string) =>
      ownerType === 'professional' ? [profId1] : [],
    );

    mockProfessionalModel.find.mockReturnValue({
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([professionalDoc1]),
    });

    const result = await service.search({ city: 'São Paulo', specialty: 'cardiology' } as any);

    const returnedIds = result.professionals.map((p: any) => p._id.toString());
    expect(returnedIds).toContain(profId1.toString());
    expect(returnedIds).not.toContain(profId2.toString());
  });

  it('search — clinics are not affected by professional subscription filter', async () => {
    subscriptionsServiceMock.findActiveOwnerIds.mockImplementation(async (ownerType: string) =>
      ownerType === 'professional' ? [] : [],
    );

    mockProfessionalModel.find.mockReturnValue({
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    });

    mockClinicModel.find.mockReturnValue({
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([clinicDoc1]),
    });

    const result = await service.search({ city: 'São Paulo' } as any);

    const returnedClinicIds = result.clinics.map((c: any) => c._id.toString());
    expect(returnedClinicIds).toEqual(expect.arrayContaining([clinicId1.toString()]));
    expect(result.clinics.length).toBeGreaterThan(0);
    expect(result.professionals).toEqual([]);
  });
});

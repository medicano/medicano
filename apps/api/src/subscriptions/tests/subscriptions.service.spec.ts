import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { SubscriptionsService } from '../subscriptions.service';
import { Subscription } from '../schemas/subscription.schema';

interface SubscriptionFixture {
  _id: Types.ObjectId;
  ownerType: 'clinic' | 'professional';
  ownerId: Types.ObjectId;
  plan: string;
  status: 'active' | 'inactive' | 'expired' | 'cancelled';
  expiresAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

describe('SubscriptionsService', () => {
  let service: SubscriptionsService;
  let model: any;

  const makeSubscription = (overrides: Partial<SubscriptionFixture> = {}): SubscriptionFixture => ({
    _id: new Types.ObjectId(),
    ownerType: 'clinic',
    ownerId: new Types.ObjectId(),
    plan: 'basic',
    status: 'active',
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    ...overrides,
  });

  const mockModel = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionsService,
        {
          provide: getModelToken(Subscription.name),
          useValue: mockModel,
        },
      ],
    }).compile();

    service = module.get<SubscriptionsService>(SubscriptionsService);
    model = mockModel;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('findByClinicId — returns subscription for given clinic id', async () => {
    const clinicId = new Types.ObjectId();
    const doc = makeSubscription({ ownerType: 'clinic', ownerId: clinicId });

    model.findOne = jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(doc) });

    const result = await service.findByClinicId(clinicId.toString());

    expect(result).toEqual(doc);
  });

  it('findByOwner(clinic, id) — returns clinic subscription', async () => {
    const clinicId = new Types.ObjectId();
    const doc = makeSubscription({ ownerType: 'clinic', ownerId: clinicId });
    model.findOne = jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(doc) });

    const result = await service.findByOwner('clinic', clinicId.toString());

    expect(model.findOne).toHaveBeenCalledWith({
      ownerType: 'clinic',
      ownerId: expect.anything(),
    });
    expect(result).toEqual(doc);
  });

  it('findByOwner(professional, id) — returns professional subscription', async () => {
    const profId = new Types.ObjectId();
    const doc = makeSubscription({ ownerType: 'professional', ownerId: profId });
    model.findOne = jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(doc) });

    const result = await service.findByOwner('professional', profId.toString());

    expect(model.findOne).toHaveBeenCalledWith({
      ownerType: 'professional',
      ownerId: expect.anything(),
    });
    expect(result).toEqual(doc);
  });

  it('findActiveOwnerIds — filters by status=active and expiresAt > now', async () => {
    const activeProfId = new Types.ObjectId();
    const expiredProfId = new Types.ObjectId();
    const inactiveProfId = new Types.ObjectId();

    const expectedDocs = [
      { ownerId: activeProfId, ownerType: 'professional' },
    ];

    model.find = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(expectedDocs),
    });

    const ids = await service.findActiveOwnerIds('professional');

    expect(model.find).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerType: 'professional',
        status: 'active',
        expiresAt: expect.objectContaining({ $gt: expect.any(Date) }),
      }),
    );
    expect(ids.map(String)).toEqual([activeProfId.toString()]);
    expect(ids.map(String)).not.toContain(expiredProfId.toString());
    expect(ids.map(String)).not.toContain(inactiveProfId.toString());
  });

  it('findByClinicId — backward compat alias delegates to findByOwner(clinic, id)', async () => {
    const clinicId = new Types.ObjectId().toString();
    const spy = jest.spyOn(service, 'findByOwner').mockResolvedValue(null as any);

    await service.findByClinicId(clinicId);

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith('clinic', clinicId);
  });
});

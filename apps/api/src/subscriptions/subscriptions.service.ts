import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import {
  Subscription,
  SubscriptionDocument,
} from './schemas/subscription.schema';

/** Union of supported owner entity types. */
type OwnerType = 'clinic' | 'professional';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    @InjectModel(Subscription.name)
    private readonly subscriptionModel: Model<SubscriptionDocument>,
  ) {}

  // ---------------------------------------------------------------------------
  // Public CRUD
  // ---------------------------------------------------------------------------

  /**
   * Creates a new subscription document.
   *
   * Supports two DTO shapes:
   * - **New shape**: `ownerType` + `ownerId` present → persisted as-is (BR-6).
   * - **Legacy shape**: only `clinicId` present → normalized to
   *   `{ ownerType: 'clinic', ownerId: clinicId, clinicId }` before persistence (BR-5).
   *
   * @param dto - The subscription creation payload.
   * @returns The persisted subscription document.
   */
  async create(dto: CreateSubscriptionDto): Promise<SubscriptionDocument> {
    let payload: Partial<CreateSubscriptionDto> & {
      ownerType: OwnerType;
      ownerId: Types.ObjectId | string;
      clinicId?: Types.ObjectId | string;
    };

    if (dto.ownerType && dto.ownerId) {
      // BR-6: new shape — persist as-is
      payload = { ...dto };
    } else if (dto.clinicId) {
      // BR-5: legacy shape — normalize
      payload = {
        ...dto,
        ownerType: 'clinic',
        ownerId: dto.clinicId,
        clinicId: dto.clinicId,
      };
    } else {
      payload = { ...dto } as typeof payload;
    }

    const created = new this.subscriptionModel(payload);
    return created.save();
  }

  // ---------------------------------------------------------------------------
  // Public queries
  // ---------------------------------------------------------------------------

  /**
   * Finds the most recent subscription for a given owner (type + id).
   *
   * @param ownerType - The type of the owner entity (`'clinic'` or `'professional'`).
   * @param ownerId   - A valid MongoDB ObjectId string identifying the owner.
   * @returns The matching subscription document, or `null` if none found.
   * @throws {BadRequestException} When `ownerId` is not a valid MongoDB ObjectId (BR-1).
   */
  async findByOwner(
    ownerType: OwnerType,
    ownerId: string,
  ): Promise<SubscriptionDocument | null> {
    if (!Types.ObjectId.isValid(ownerId)) {
      throw new BadRequestException('Invalid ownerId');
    }

    return this.subscriptionModel
      .findOne({ ownerType, ownerId: new Types.ObjectId(ownerId) })
      .exec();
  }

  /**
   * Returns the list of owner ObjectIds that have an **active** subscription
   * for the given owner type.
   *
   * An active subscription satisfies:
   * - `status === 'active'`
   * - `expiresAt > now` (BR-3)
   *
   * @param ownerType - The type of owner entity to filter by.
   * @returns An array of ObjectIds representing owners with active subscriptions.
   */
  async findActiveOwnerIds(ownerType: OwnerType): Promise<Types.ObjectId[]> {
    const now = new Date();

    const docs = await this.subscriptionModel
      .find(
        { ownerType, status: 'active', expiresAt: { $gt: now } },
        { ownerId: 1 },
      )
      .exec();

    return docs.map((doc) => doc.ownerId as unknown as Types.ObjectId);
  }

  /**
   * Finds the most recent subscription for a clinic by its ID.
   *
   * @deprecated Use `findByOwner('clinic', clinicId)` instead.
   *
   * Retained for backward compatibility (BR-4). Delegates to `findByOwner`.
   *
   * @param clinicId - A valid MongoDB ObjectId string for the clinic.
   * @returns The matching subscription document, or `null` if none found.
   */
  async findByClinicId(clinicId: string): Promise<SubscriptionDocument | null> {
    return this.findByOwner('clinic', clinicId);
  }

  // ---------------------------------------------------------------------------
  // Public business methods
  // ---------------------------------------------------------------------------

  /**
   * Enforces the maximum number of professionals allowed for a clinic's
   * active subscription plan.
   *
   * Internally resolves the clinic's subscription via `findByOwner` (BR-7).
   *
   * @param clinicId            - The clinic's MongoDB ObjectId string.
   * @param currentProfessionalCount - The number of professionals currently associated.
   * @throws {NotFoundException}    When no subscription is found for the clinic.
   * @throws {BadRequestException}  When the professional limit has been reached.
   */
  async findOne(id: string): Promise<SubscriptionDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid subscription ID');
    }
    const subscription = await this.subscriptionModel.findById(id).exec();
    if (!subscription) {
      throw new NotFoundException(`Subscription ${id} not found`);
    }
    return subscription;
  }

  async update(id: string, dto: UpdateSubscriptionDto): Promise<SubscriptionDocument> {
    const subscription = await this.findOne(id);
    if (dto.plan !== undefined) subscription.plan = dto.plan;
    if (dto.status !== undefined) subscription.status = dto.status;
    if (dto.expiresAt !== undefined) subscription.expiresAt = new Date(dto.expiresAt);
    return subscription.save();
  }

  async cancel(id: string): Promise<SubscriptionDocument> {
    const subscription = await this.findOne(id);
    subscription.status = 'cancelled';
    return subscription.save();
  }

  async enforceClinicProfessionalLimit(
    clinicId: string,
    currentProfessionalCount: number,
  ): Promise<void> {
    const subscription = await this.findByOwner('clinic', clinicId);

    if (!subscription) {
      throw new NotFoundException(
        `No subscription found for clinic ${clinicId}`,
      );
    }

    const limit: number = (subscription as any).professionalLimit ?? Infinity;

    if (currentProfessionalCount >= limit) {
      throw new BadRequestException(
        `Professional limit of ${limit} reached for clinic ${clinicId}`,
      );
    }
  }
}

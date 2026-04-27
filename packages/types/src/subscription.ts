export enum SubscriptionPlan {
  FREE = 'free',
  BASIC = 'basic',
  PRO = 'pro',
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}

export const PLAN_PROFESSIONAL_LIMITS: Record<SubscriptionPlan, number> = {
  [SubscriptionPlan.FREE]: 2,
  [SubscriptionPlan.BASIC]: 10,
  [SubscriptionPlan.PRO]: -1, // -1 = unlimited
};

export interface Subscription {
  _id: string;
  ownerType: 'clinic' | 'professional';
  ownerId: string;
  clinicId?: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

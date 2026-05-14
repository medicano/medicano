export enum SubscriptionPlan {
  FREE = 'free',
  BASIC = 'basic',
  PRO = 'pro',
}

export enum SubscriptionStatus {
  TRIAL = 'trial',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export interface Subscription {
  _id: string;
  clinicId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export const PLAN_PROFESSIONAL_LIMITS: Record<SubscriptionPlan, number> = {
  [SubscriptionPlan.FREE]: 2,
  [SubscriptionPlan.BASIC]: 10,
  [SubscriptionPlan.PRO]: -1,
};

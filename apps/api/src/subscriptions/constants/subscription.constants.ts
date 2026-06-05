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

export const PLAN_PROFESSIONAL_LIMITS: Record<SubscriptionPlan, number> = {
  [SubscriptionPlan.FREE]: 2,
  [SubscriptionPlan.BASIC]: 10,
  [SubscriptionPlan.PRO]: -1,
};

// Limite de atendentes por plano da clínica. -1 = ilimitado.
// Gratuito tem 2; os pagos crescem proporcionalmente ao valor do plano.
export const PLAN_ATTENDANT_LIMITS: Record<SubscriptionPlan, number> = {
  [SubscriptionPlan.FREE]: 2,
  [SubscriptionPlan.BASIC]: 5,
  [SubscriptionPlan.PRO]: 10,
};

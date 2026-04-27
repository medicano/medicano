export enum SubscriptionPlan {
  BASIC = 'BASIC',
  PREMIUM = 'PREMIUM',
}

export interface SubscriptionPlanLimits {
  clinicLimit: number;
  appointmentLimit: number;
  aiTriageEnabled: boolean;
  prioritySupport: boolean;
}

export const SUBSCRIPTION_PLAN_LIMITS: Record<SubscriptionPlan, SubscriptionPlanLimits> = {
  [SubscriptionPlan.BASIC]: {
    clinicLimit: 1,
    appointmentLimit: 100,
    aiTriageEnabled: false,
    prioritySupport: false,
  },
  [SubscriptionPlan.PREMIUM]: {
    clinicLimit: 10,
    appointmentLimit: 1000,
    aiTriageEnabled: true,
    prioritySupport: true,
  },
};

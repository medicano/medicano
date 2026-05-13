export enum SubscriptionPlan {
  BASIC = 'BASIC',
  PREMIUM = 'PREMIUM',
}

export interface SubscriptionPlanLimits {
  clinicLimit: number;
  professionalLimit: number;
  appointmentLimit: number;
  aiTriageEnabled: boolean;
  prioritySupport: boolean;
}

export const SUBSCRIPTION_PLAN_LIMITS: Record<SubscriptionPlan, SubscriptionPlanLimits> = {
  [SubscriptionPlan.BASIC]: {
    clinicLimit: 1,
    professionalLimit: 5,
    appointmentLimit: 100,
    aiTriageEnabled: false,
    prioritySupport: false,
  },
  [SubscriptionPlan.PREMIUM]: {
    clinicLimit: 10,
    professionalLimit: 50,
    appointmentLimit: 1000,
    aiTriageEnabled: true,
    prioritySupport: true,
  },
};

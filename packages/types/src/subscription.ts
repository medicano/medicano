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

export interface Subscription {
  _id: string;
  userId: string;
  plan: SubscriptionPlan;
  clinicLimit: number;
  appointmentLimit: number;
  aiTriageEnabled: boolean;
  prioritySupport: boolean;
  isActive: boolean;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSubscriptionRequest {
  plan: SubscriptionPlan;
  expiresAt?: Date;
}

export interface UpdateSubscriptionRequest {
  plan?: SubscriptionPlan;
  isActive?: boolean;
  expiresAt?: Date;
}

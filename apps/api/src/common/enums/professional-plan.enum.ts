// Plano do profissional autônomo. Diferente de SubscriptionPlan (que é da
// clínica): aqui o plano é guardado no próprio perfil do profissional, sem
// cobrança/limite forçado — espelha as opções exibidas no cadastro.
export enum ProfessionalPlan {
  FREE = 'free',
  BASICO = 'basico',
  AVANCADO = 'avancado',
}

// Limite de atendentes por plano do profissional. -1 = ilimitado.
// Gratuito tem 2; os pagos crescem proporcionalmente ao valor do plano.
export const PROFESSIONAL_PLAN_ATTENDANT_LIMITS: Record<ProfessionalPlan, number> = {
  [ProfessionalPlan.FREE]: 2,
  [ProfessionalPlan.BASICO]: 4,
  [ProfessionalPlan.AVANCADO]: 6,
};

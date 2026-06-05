// Plano do profissional autônomo. Diferente de SubscriptionPlan (que é da
// clínica): aqui o plano é guardado no próprio perfil do profissional, sem
// cobrança/limite forçado — espelha as opções exibidas no cadastro.
export enum ProfessionalPlan {
  FREE = 'free',
  BASICO = 'basico',
  AVANCADO = 'avancado',
}

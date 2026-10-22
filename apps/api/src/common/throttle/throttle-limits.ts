const ONE_MINUTE_MS = 60_000;

// Limites por IP. O padrão vale para toda a API; as rotas sensíveis apertam.
export const DEFAULT_THROTTLE = { limit: 120, ttl: ONE_MINUTE_MS };

// Login: barra força bruta de senha. Folga para a recepção de uma clínica,
// onde vários atendentes entram pelo mesmo IP no começo do turno.
export const LOGIN_THROTTLE = { default: { limit: 10, ttl: ONE_MINUTE_MS } };

// Cadastro aberto: evita criar contas em massa para usar o assistente.
export const SIGNUP_THROTTLE = { default: { limit: 5, ttl: 10 * ONE_MINUTE_MS } };

// Assistente: cada mensagem é uma chamada paga à Anthropic.
export const CHAT_MESSAGE_THROTTLE = { default: { limit: 20, ttl: ONE_MINUTE_MS } };
export const CHAT_SESSION_THROTTLE = { default: { limit: 10, ttl: ONE_MINUTE_MS } };

export const THROTTLE_ERROR_MESSAGE =
  'Muitas tentativas em pouco tempo. Aguarde um minuto e tente de novo.';

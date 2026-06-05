import { CookieOptions } from 'express';

// Nome do cookie httpOnly que carrega o JWT. O token nunca é exposto ao JS do
// navegador (defesa contra roubo via XSS); o browser o reenvia automaticamente.
export const AUTH_COOKIE_NAME = 'medicano_token';

// 7 dias, igual ao TTL do token no Redis (auth.service.TOKEN_TTL).
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// Opções do cookie de sessão.
// - httpOnly: não acessível por JS.
// - sameSite 'lax': frontend e API são o mesmo site (eTLD+1 medicano.app), então
//   o cookie viaja nas chamadas XHR same-site; bloqueia o grosso de CSRF cross-site.
// - secure só em produção (em dev o front roda em http://localhost).
// - domain: em produção o front está no apex (medicano.app) e a API num subdomínio
//   (api.medicano.app). Setar COOKIE_DOMAIN=.medicano.app faz o cookie ser
//   first-party do site inteiro — alguns navegadores (ex.: Brave) bloqueiam um
//   cookie host-only de subdomínio tratando-o como cross-site. Em dev fica vazio
//   (host-only em localhost).
export function buildAuthCookieOptions(): CookieOptions {
  const isProduction = process.env.NODE_ENV === 'production';
  // Em produção o cookie precisa cobrir apex + subdomínios (.medicano.app);
  // COOKIE_DOMAIN permite sobrescrever. Em dev/test fica host-only (localhost).
  const domain = process.env.COOKIE_DOMAIN ?? (isProduction ? '.medicano.app' : undefined);
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: TOKEN_TTL_MS,
    ...(domain ? { domain } : {}),
  };
}

// Mesmas flags do set (sem maxAge) — necessário para o browser aceitar o clear.
export function buildAuthCookieClearOptions(): CookieOptions {
  const { maxAge: _maxAge, ...rest } = buildAuthCookieOptions();
  return rest;
}

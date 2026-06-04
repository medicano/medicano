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
// - sem `domain`: cookie host-only do próprio host da API, que é para onde o
//   frontend faz as requisições — não depende do domínio do frontend.
export function buildAuthCookieOptions(): CookieOptions {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: TOKEN_TTL_MS,
  };
}

// Mesmas flags do set (sem maxAge) — necessário para o browser aceitar o clear.
export function buildAuthCookieClearOptions(): CookieOptions {
  const { maxAge: _maxAge, ...rest } = buildAuthCookieOptions();
  return rest;
}

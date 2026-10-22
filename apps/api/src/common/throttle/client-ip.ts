export interface ClientIpRequest {
  headers: Record<string, string | string[] | undefined>;
  ip?: string;
}

// IP real de quem fez a requisição, usado como chave do limite de requisições.
//
// Em produção toda requisição chega pelo Cloudflare Tunnel: o `req.ip` é o do
// container `cloudflared`, igual para todo mundo. O Cloudflare sempre preenche
// `CF-Connecting-IP` com o IP do visitante e sobrescreve o valor que o cliente
// mandar, e a API não tem porta aberta fora do túnel, então o cabeçalho é
// confiável. Sem ele (desenvolvimento local), vale o `req.ip`.
export function getClientIp(req: ClientIpRequest): string {
  const cloudflareIp = req.headers['cf-connecting-ip'];
  if (typeof cloudflareIp === 'string' && cloudflareIp.length > 0) {
    return cloudflareIp;
  }
  return req.ip ?? 'unknown';
}

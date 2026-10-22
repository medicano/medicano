import { getClientIp } from '../client-ip';

describe('getClientIp', () => {
  afterEach(() => jest.clearAllMocks());

  it('should use CF-Connecting-IP when the request came through Cloudflare', () => {
    const clientIp = getClientIp({
      headers: { 'cf-connecting-ip': '203.0.113.7' },
      ip: '172.18.0.4',
    });

    expect(clientIp).toBe('203.0.113.7');
  });

  it('should fall back to req.ip when the header is missing', () => {
    expect(getClientIp({ headers: {}, ip: '127.0.0.1' })).toBe('127.0.0.1');
  });

  it('should ignore an empty CF-Connecting-IP header', () => {
    expect(getClientIp({ headers: { 'cf-connecting-ip': '' }, ip: '127.0.0.1' })).toBe(
      '127.0.0.1',
    );
  });
});

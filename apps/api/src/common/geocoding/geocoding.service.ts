import { Injectable } from '@nestjs/common';
import { AddressFormDto } from '../dto/address-form.dto';

export interface GeoCoordinates {
  lat: number;
  lng: number;
}

@Injectable()
export class GeocodingService {
  // Geocodifica o endereço estruturado de forma resiliente: tenta do mais
  // específico (rua+número+cidade) ao mais genérico (CEP, depois cidade/UF) e
  // retorna o primeiro acerto. No Brasil muitas ruas não estão no OSM, mas o CEP
  // resolve para a região correta — suficiente para a busca por proximidade.
  async geocodeAddressForm(form: AddressFormDto): Promise<GeoCoordinates | null> {
    const cepDigits = (form.cep ?? '').replace(/\D/g, '');
    const streetLine = form.street
      ? [form.street, form.number].filter(Boolean).join(', ')
      : '';
    const candidates = [
      [streetLine, form.neighborhood, form.city, form.state, cepDigits]
        .filter(Boolean)
        .join(', '),
      cepDigits,
      [form.city, form.state].filter(Boolean).join(', '),
    ].filter((query) => query.trim().length > 0);

    for (const query of candidates) {
      const coords = await this.geocodeAddress(query);
      if (coords) return coords;
    }
    return null;
  }

  // IPs privados/loopback não têm geolocalização significativa.
  private isPrivateIp(ip: string): boolean {
    return !ip || ip === '127.0.0.1' || ip === '::1' || /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/.test(ip);
  }

  async getLocationByIp(ip: string): Promise<GeoCoordinates | null> {
    if (this.isPrivateIp(ip)) return null;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,lat,lon`, {
        signal: controller.signal,
      });
      const data = (await response.json()) as { status: string; lat: number; lon: number };
      if (data.status === 'success') return { lat: data.lat, lng: data.lon };
      return null;
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  // Nominatim é um serviço externo: limitamos o tempo de espera para que uma
  // resposta lenta não bloqueie o fluxo que depende das coordenadas (cadastro
  // ou edição de clínica). Em caso de falha, devolve null e o chamador decide.
  async geocodeAddress(address: string): Promise<GeoCoordinates | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&countrycodes=br`;
      const response = await fetch(url, {
        headers: { 'User-Agent': 'Medicano/1.0 (contato@medicano.app)' },
        signal: controller.signal,
      });
      const matches = (await response.json()) as Array<{ lat: string; lon: string }>;
      if (!matches[0]) return null;
      return { lat: parseFloat(matches[0].lat), lng: parseFloat(matches[0].lon) };
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }
}

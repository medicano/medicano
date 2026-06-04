import { Injectable } from '@nestjs/common';

export interface GeoCoordinates {
  lat: number;
  lng: number;
}

@Injectable()
export class GeocodingService {
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

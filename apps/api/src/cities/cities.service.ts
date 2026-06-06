import { Injectable, Logger } from '@nestjs/common';

export interface City {
  name: string;
  state: string;
}

interface IbgeMunicipio {
  nome: string;
  microrregiao?: { mesorregiao?: { UF?: { sigla?: string } } };
}

const IBGE_MUNICIPIOS_URL =
  'https://servicodados.ibge.gov.br/api/v1/localidades/municipios?orderBy=nome';

const MAX_RESULTS = 10;

@Injectable()
export class CitiesService {
  private readonly logger = new Logger(CitiesService.name);

  // A lista de municípios do IBGE é estável; carregamos uma vez e mantemos em
  // memória pelo processo todo. Compartilhar a promise evita buscas paralelas
  // duplicadas quando vários requests chegam antes do primeiro fetch resolver.
  private municipalitiesCache: Promise<City[]> | null = null;

  async search(query: string): Promise<City[]> {
    const term = this.normalize(query ?? '');
    if (term.length < 2) return [];

    const cities = await this.loadMunicipalities();

    const startsWith: City[] = [];
    const contains: City[] = [];
    for (const city of cities) {
      const normalizedName = this.normalize(city.name);
      if (normalizedName.startsWith(term)) {
        startsWith.push(city);
      } else if (normalizedName.includes(term)) {
        contains.push(city);
      }
    }

    return [...startsWith, ...contains].slice(0, MAX_RESULTS);
  }

  private loadMunicipalities(): Promise<City[]> {
    if (this.municipalitiesCache) return this.municipalitiesCache;

    this.municipalitiesCache = this.fetchMunicipalities().catch((error: unknown) => {
      // Falha de rede não deve fixar uma lista vazia em cache: zera para tentar
      // de novo no próximo request e devolve vazio para este.
      this.municipalitiesCache = null;
      this.logger.warn(`Falha ao carregar municípios do IBGE: ${(error as Error).message}`);
      return [];
    });

    return this.municipalitiesCache;
  }

  private async fetchMunicipalities(): Promise<City[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(IBGE_MUNICIPIOS_URL, { signal: controller.signal });
      const municipalities = (await response.json()) as IbgeMunicipio[];
      return municipalities.map((municipality) => ({
        name: municipality.nome,
        state: municipality.microrregiao?.mesorregiao?.UF?.sigla ?? '',
      }));
    } finally {
      clearTimeout(timeout);
    }
  }

  private normalize(text: string): string {
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }
}

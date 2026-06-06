import { Test, TestingModule } from '@nestjs/testing';
import { CitiesService } from '../cities.service';

const ibgeResponse = [
  { nome: 'São Paulo', microrregiao: { mesorregiao: { UF: { sigla: 'SP' } } } },
  { nome: 'São Bernardo do Campo', microrregiao: { mesorregiao: { UF: { sigla: 'SP' } } } },
  { nome: 'Salvador', microrregiao: { mesorregiao: { UF: { sigla: 'BA' } } } },
  { nome: 'Santos', microrregiao: { mesorregiao: { UF: { sigla: 'SP' } } } },
  { nome: "Estrela d'Oeste", microrregiao: { mesorregiao: { UF: { sigla: 'SP' } } } },
];

describe('CitiesService', () => {
  let citiesService: CitiesService;
  let fetchMock: jest.Mock;

  beforeEach(async () => {
    fetchMock = jest.fn().mockResolvedValue({ json: async () => ibgeResponse });
    global.fetch = fetchMock as unknown as typeof fetch;

    const module: TestingModule = await Test.createTestingModule({
      providers: [CitiesService],
    }).compile();

    citiesService = module.get<CitiesService>(CitiesService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('search', () => {
    it('returns empty array for terms shorter than 2 characters without calling IBGE', async () => {
      const result = await citiesService.search('s');

      expect(result).toEqual([]);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('matches accent-insensitively', async () => {
      const result = await citiesService.search('sao paulo');

      expect(result).toContainEqual({ name: 'São Paulo', state: 'SP' });
    });

    it('matches names with punctuation without typing the punctuation', async () => {
      const withoutApostrophe = await citiesService.search('estrela do');
      expect(withoutApostrophe).toContainEqual({ name: "Estrela d'Oeste", state: 'SP' });

      const partial = await citiesService.search('estrela');
      expect(partial).toContainEqual({ name: "Estrela d'Oeste", state: 'SP' });
    });

    it('prioritizes prefix matches over substring matches', async () => {
      const result = await citiesService.search('santos');

      expect(result[0]).toEqual({ name: 'Santos', state: 'SP' });
    });

    it('caches the IBGE list across searches (fetches once)', async () => {
      await citiesService.search('sao');
      await citiesService.search('salvador');

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('returns empty array and does not cache when IBGE fetch fails', async () => {
      fetchMock.mockRejectedValueOnce(new Error('network down'));

      const firstAttempt = await citiesService.search('sao');
      expect(firstAttempt).toEqual([]);

      // Cache foi zerado: a próxima busca tenta o IBGE de novo.
      const secondAttempt = await citiesService.search('sao');
      expect(secondAttempt).toContainEqual({ name: 'São Paulo', state: 'SP' });
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });
});

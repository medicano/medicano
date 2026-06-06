import { MapPin } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface City {
  name: string;
  state: string;
}

interface CityAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

// A lista de municípios do IBGE é estável e grande (~5570); buscamos uma única
// vez por sessão e compartilhamos a mesma promise entre instâncias, filtrando no
// cliente. Sem rate limit nem chave, e sem chamada de rede a cada tecla.
let citiesCache: Promise<City[]> | null = null;

interface IbgeMunicipio {
  nome: string;
  microrregiao?: { mesorregiao?: { UF?: { sigla?: string } } };
}

function loadCities(): Promise<City[]> {
  if (citiesCache) return citiesCache;
  citiesCache = fetch(
    'https://servicodados.ibge.gov.br/api/v1/localidades/municipios?orderBy=nome',
  )
    .then((res) => res.json() as Promise<IbgeMunicipio[]>)
    .then((data) =>
      data.map((m) => ({
        name: m.nome,
        state: m.microrregiao?.mesorregiao?.UF?.sigla ?? '',
      })),
    )
    .catch(() => {
      // Falha de rede não deve travar o filtro: zera o cache para tentar de novo
      // na próxima interação e devolve lista vazia (input vira texto livre).
      citiesCache = null;
      return [];
    });
  return citiesCache;
}

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function CityAutocomplete({ value, onChange, placeholder }: CityAutocompleteProps) {
  const [cities, setCities] = useState<City[]>([]);
  const [suggestions, setSuggestions] = useState<City[]>([]);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  function handleChange(input: string) {
    onChange(input);
    const term = normalize(input);
    if (term.length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    const list = cities.length > 0 ? cities : null;
    if (!list) {
      // Primeira interação: carrega a lista e refiltra quando ela chega.
      loadCities().then((loaded) => {
        setCities(loaded);
        setSuggestions(filterCities(loaded, term));
        setOpen(filterCities(loaded, term).length > 0);
      });
      return;
    }

    const matches = filterCities(list, term);
    setSuggestions(matches);
    setOpen(matches.length > 0);
    setHighlighted(-1);
  }

  function filterCities(list: City[], term: string): City[] {
    const startsWith: City[] = [];
    const contains: City[] = [];
    for (const city of list) {
      const normalized = normalize(city.name);
      if (normalized.startsWith(term)) startsWith.push(city);
      else if (normalized.includes(term)) contains.push(city);
      if (startsWith.length >= 8) break;
    }
    return [...startsWith, ...contains].slice(0, 8);
  }

  function handleSelect(city: City) {
    onChange(city.name);
    setOpen(false);
    setSuggestions([]);
    setHighlighted(-1);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, suggestions.length - 1));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    }
    if (e.key === 'Enter' && highlighted >= 0) {
      e.preventDefault();
      handleSelect(suggestions[highlighted]);
    }
    if (e.key === 'Escape') setOpen(false);
  }

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
      <input
        type="text"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full h-11 pl-9 pr-4 rounded-xl bg-white border border-[#E2E8F0] text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#00B4D8] transition-colors"
      />

      {open && suggestions.length > 0 && (
        <ul className="absolute top-[calc(100%+4px)] left-0 right-0 z-50 max-h-60 overflow-y-auto rounded-xl border border-[#E2E8F0] bg-white shadow-xl">
          {suggestions.map((city, i) => (
            <li
              key={`${city.name}-${city.state}`}
              onPointerDown={() => handleSelect(city)}
              onMouseEnter={() => setHighlighted(i)}
              className={`flex cursor-pointer items-center gap-2.5 px-3 py-2.5 text-sm transition-colors ${
                i === highlighted ? 'bg-[#F0FBFF] text-[#023E8A]' : 'text-[#0F172A] hover:bg-[#F8FAFC]'
              }`}
            >
              <MapPin size={13} className="shrink-0 text-[#00B4D8]" />
              <span className="leading-snug">
                {city.name}
                {city.state && <span className="text-[#94A3B8]"> — {city.state}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

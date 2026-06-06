import { MapPin } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { api } from '../../lib/api';

interface City {
  name: string;
  state: string;
}

interface CityAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function CityAutocomplete({ value, onChange, placeholder }: CityAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<City[]>([]);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Busca os municípios pela nossa API (que consulta o IBGE no servidor): assim
  // a sugestão funciona mesmo em navegadores que bloqueiam requisições externas.
  function handleChange(input: string) {
    onChange(input);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (input.trim().length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await api.get<City[]>('/cities', { params: { q: input.trim() } });
        setSuggestions(data);
        setOpen(data.length > 0);
        setHighlighted(-1);
      } catch {
        setSuggestions([]);
        setOpen(false);
      } finally {
        setLoading(false);
      }
    }, 250);
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
      {loading && (
        <svg
          className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[#94A3B8]"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      <input
        type="text"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full h-11 pl-9 pr-9 rounded-xl bg-white border border-[#E2E8F0] text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#00B4D8] transition-colors"
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

import { MapPin } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface Suggestion {
  street: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (suggestion: Suggestion) => void;
  placeholder?: string;
}

function buildShortAddress(d: any): string {
  const a = d.address ?? {};
  const road = a.road ?? a.pedestrian ?? a.street ?? '';
  const city = a.city ?? a.town ?? a.village ?? a.municipality ?? '';
  const state = a.state ?? '';
  const parts = [road, city, state].filter(Boolean);
  return parts.join(', ');
}

export function AddressAutocomplete({ value, onChange, onSelect, placeholder }: AddressAutocompleteProps) {
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // inicializa com o valor atual (ou placeholder se o valor ainda não foi digitado)
  useEffect(() => {
    const source = value || placeholder || '';
    if (!source) return;
    const match = source.match(/^(.+?),\s*(\d+\w*)(,.*)?$/);
    if (match) {
      setStreet(match[1].trim());
      setNumber(match[2].trim());
    } else {
      setStreet(source.trim());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placeholder]);

  function emit(s: string, n: string) {
    const full = n.trim() ? `${s.trim()}, ${n.trim()}` : s.trim();
    onChange(full);
  }

  function handleStreetChange(v: string) {
    setStreet(v);
    emit(v, number);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (v.length < 4) { setSuggestions([]); setOpen(false); return; }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(v)}&format=json&limit=5&countrycodes=br&addressdetails=1`;
        const res = await fetch(url);
        const data: any[] = await res.json();
        const parsed: Suggestion[] = data
          .map((d) => ({
            street: buildShortAddress(d),
            city: d.address?.city ?? d.address?.town ?? '',
            state: d.address?.state ?? '',
            lat: parseFloat(d.lat),
            lng: parseFloat(d.lon),
          }))
          .filter((s) => s.street);
        setSuggestions(parsed);
        setOpen(parsed.length > 0);
        setHighlighted(-1);
      } catch {
        setSuggestions([]);
        setOpen(false);
      } finally {
        setLoading(false);
      }
    }, 350);
  }

  function handleNumberChange(v: string) {
    setNumber(v);
    emit(street, v);
  }

  function handleSelect(s: Suggestion) {
    setStreet(s.street);
    emit(s.street, number);
    onSelect?.(s);
    setOpen(false);
    setSuggestions([]);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlighted((h) => Math.min(h + 1, suggestions.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setHighlighted((h) => Math.max(h - 1, 0)); }
    if (e.key === 'Enter' && highlighted >= 0) { e.preventDefault(); handleSelect(suggestions[highlighted]); }
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

  const streetPlaceholder = placeholder?.split(',')[0] ?? 'Av. Paulista';

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-[#475569]">Endereço</label>
      <div className="flex gap-2">
        {/* Street autocomplete */}
        <div ref={containerRef} className="relative flex-1">
          <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
          {loading && (
            <svg className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[#94A3B8]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          <input
            type="text"
            value={street}
            onChange={(e) => handleStreetChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => suggestions.length > 0 && setOpen(true)}
            placeholder={streetPlaceholder}
            autoComplete="off"
            className="w-full rounded-xl border border-[#E2E8F0] bg-white py-2.5 pl-9 pr-8 text-sm text-[#03045E] outline-none transition focus:border-[#00B4D8] focus:ring-2 focus:ring-[#00B4D8]/20"
          />

          {open && suggestions.length > 0 && (
            <ul className="absolute top-[calc(100%+4px)] left-0 right-0 z-50 max-h-60 overflow-y-auto rounded-xl border border-[#E2E8F0] bg-white shadow-xl">
              {suggestions.map((s, i) => (
                <li
                  key={i}
                  onPointerDown={() => handleSelect(s)}
                  onMouseEnter={() => setHighlighted(i)}
                  className={`flex cursor-pointer items-start gap-2.5 px-3 py-2.5 text-sm transition-colors ${
                    i === highlighted ? 'bg-[#F0FBFF] text-[#023E8A]' : 'text-[#0F172A] hover:bg-[#F8FAFC]'
                  }`}
                >
                  <MapPin size={13} className="mt-0.5 shrink-0 text-[#00B4D8]" />
                  <span className="leading-snug">{s.street}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Number */}
        <input
          type="text"
          value={number}
          onChange={(e) => handleNumberChange(e.target.value)}
          placeholder="Nº"
          className="w-20 rounded-xl border border-[#E2E8F0] bg-white py-2.5 px-3 text-sm text-[#03045E] outline-none transition focus:border-[#00B4D8] focus:ring-2 focus:ring-[#00B4D8]/20"
        />
      </div>
    </div>
  );
}

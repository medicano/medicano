import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { ChevronDown, Search, X, Check } from 'lucide-react';

export const MEDICAL_SPECIALTIES = [
  'Medicina',
  'Psicologia',
  'Odontologia',
  'Nutrição',
  'Fisioterapia',
  'Fonoaudiologia',
  'Psiquiatria',
  'Dermatologia',
  'Cardiologia',
  'Ortopedia',
  'Ginecologia',
  'Neurologia',
  'Oftalmologia',
  'Outro',
] as const;

/** Maps Portuguese display labels → backend Specialty enum values */
export const SPECIALTY_LABEL_TO_ENUM: Record<string, string> = {
  Medicina: 'medicine',
  Psicologia: 'psychology',
  Psiquiatria: 'psychiatry',
  Odontologia: 'dentistry',
  Nutrição: 'nutrition',
  Fisioterapia: 'physiotherapy',
  Fonoaudiologia: 'speech_therapy',
  Dermatologia: 'dermatology',
  Cardiologia: 'cardiology',
  Ortopedia: 'orthopedics',
  Ginecologia: 'gynecology',
  Neurologia: 'neurology',
  Oftalmologia: 'ophthalmology',
};

export type MedicalSpecialty = typeof MEDICAL_SPECIALTIES[number];

export interface SpecialtyComboboxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  /** For showcase/storybook use only — keeps the dropdown open */
  _forceOpen?: boolean;
  /** For showcase/storybook use only — pre-fills the search query */
  _initialQuery?: string;
}

export function SpecialtyCombobox({
  value,
  onChange,
  placeholder = 'Selecionar especialidade',
  label,
  error,
  disabled = false,
  _forceOpen = false,
  _initialQuery = '',
}: SpecialtyComboboxProps) {
  const [open, setOpen] = useState(_forceOpen);
  const [query, setQuery] = useState(_initialQuery);
  const [highlighted, setHighlighted] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef     = useRef<HTMLInputElement>(null);
  const triggerRef   = useRef<HTMLButtonElement>(null);
  const listRef      = useRef<HTMLUListElement>(null);

  // Filter options by substring (case-insensitive)
  const filtered = useMemo(() =>
    MEDICAL_SPECIALTIES.filter((s) =>
      s.toLowerCase().includes(query.toLowerCase())
    ),
    [query],
  );

  // Auto-highlight the current value when opening
  useEffect(() => {
    if (open && value) {
      const idx = filtered.indexOf(value as MedicalSpecialty);
      setHighlighted(idx >= 0 ? idx : -1);
    }
  }, [open]);

  // Close on outside click (skip when _forceOpen)
  useEffect(() => {
    if (_forceOpen) return;
    function onPointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [_forceOpen]);

  // Focus search input when opening
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  // Scroll nearest scrollable ancestor to reveal dropdown when it opens
  useEffect(() => {
    if (!open || !containerRef.current) return;
    requestAnimationFrame(() => {
      const container = containerRef.current!;
      const triggerBottom = container.getBoundingClientRect().bottom;
      const dropdownHeight = 320;
      const viewportBottom = window.innerHeight;

      if (triggerBottom + dropdownHeight <= viewportBottom) return;

      let scrollable: HTMLElement | null = container.parentElement;
      while (scrollable) {
        const { overflowY } = window.getComputedStyle(scrollable);
        if (overflowY === 'auto' || overflowY === 'scroll') {
          const excess = triggerBottom + dropdownHeight - scrollable.getBoundingClientRect().bottom;
          if (excess > 0) scrollable.scrollBy({ top: excess + 16, behavior: 'smooth' });
          break;
        }
        scrollable = scrollable.parentElement;
      }
    });
  }, [open]);

  // Scroll highlighted option into view
  useEffect(() => {
    if (highlighted < 0 || !listRef.current) return;
    const item = listRef.current.children[highlighted] as HTMLElement | null;
    item?.scrollIntoView({ block: 'nearest' });
  }, [highlighted]);

  const openDropdown  = useCallback(() => { if (!disabled) { setOpen(true); setHighlighted(-1); } }, [disabled]);
  const closeDropdown = useCallback(() => { setOpen(false); setQuery(''); setHighlighted(-1); }, []);

  const handleSelect = useCallback((specialty: string) => {
    onChange(specialty);
    closeDropdown();
    requestAnimationFrame(() => triggerRef.current?.focus());
  }, [onChange, closeDropdown]);

  const handleClear = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setQuery('');
    requestAnimationFrame(() => triggerRef.current?.focus());
  }, [onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!open) { openDropdown(); break; }
        setHighlighted((h) => (h < filtered.length - 1 ? h + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlighted((h) => (h > 0 ? h - 1 : filtered.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (!open) { openDropdown(); break; }
        if (highlighted >= 0 && filtered[highlighted]) handleSelect(filtered[highlighted]);
        break;
      case 'Escape':
        closeDropdown();
        break;
      case 'Tab':
        closeDropdown();
        break;
    }
  }, [open, filtered, highlighted, openDropdown, closeDropdown, handleSelect]);

  // ─── Render ──────────────────────────────────────────────────────────────────

  const triggerActive = open;
  const hasError = !!error;

  const triggerClass = [
    'w-full h-11 px-3.5 rounded-xl border bg-white text-sm text-left flex items-center gap-2 transition-all duration-150',
    triggerActive
      ? 'border-[#0077B6] ring-2 ring-[#0077B6]/10 shadow-sm'
      : hasError
      ? 'border-[#EF4444] ring-2 ring-[#EF4444]/10'
      : 'border-[#E2E8F0] hover:border-[#0077B6]/50',
    disabled ? 'opacity-50 cursor-not-allowed bg-[#F8FAFC]' : 'cursor-pointer',
  ].join(' ');

  return (
    <div ref={containerRef} className={`w-full ${open ? 'pb-80' : ''}`}>
      {label && (
        <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-2">
          {label}
        </label>
      )}

      <div className="relative">
      {/* ── Trigger ────────────────────────────────────────────────────────── */}
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-autocomplete="list"
        disabled={disabled}
        onClick={() => (open ? closeDropdown() : openDropdown())}
        onKeyDown={!open ? handleKeyDown : undefined}
        className={triggerClass}
      >
        {/* Selected value chip or placeholder */}
        <span className="flex-1 min-w-0 flex items-center gap-2">
          {value ? (
            <>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#CAF0F8] text-[#023E8A] text-xs font-semibold border border-[#90E0EF]/50">
                {value}
              </span>
            </>
          ) : (
            <span className="text-[#94A3B8] truncate">{placeholder}</span>
          )}
        </span>

        {/* Right controls */}
        <span className="flex items-center gap-0.5 shrink-0">
          {value && !disabled && (
            <span
              role="button"
              aria-label="Limpar seleção"
              onClick={handleClear}
              className="w-6 h-6 flex items-center justify-center rounded-full text-[#64748B] hover:bg-[#FEE2E2] hover:text-[#EF4444] transition-colors"
            >
              <X size={13} strokeWidth={2.5} />
            </span>
          )}
          <span className={`w-6 h-6 flex items-center justify-center text-[#64748B] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
            <ChevronDown size={15} />
          </span>
        </span>
      </button>

      {/* ── Dropdown ───────────────────────────────────────────────────────── */}
      {open && (
        <div
          role="listbox"
          aria-label="Especialidades médicas"
          className="absolute top-[calc(100%+6px)] left-0 right-0 z-50 bg-white border border-[#E2E8F0] rounded-xl shadow-xl shadow-[#0077B6]/8 overflow-hidden"
        >
          {/* Search input */}
          <div className="px-2.5 pt-2.5 pb-2 border-b border-[#F1F5F9]">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                role="searchbox"
                aria-label="Filtrar especialidades"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setHighlighted(-1); }}
                onKeyDown={handleKeyDown}
                placeholder="Buscar especialidade…"
                className="w-full h-9 pl-8 pr-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#0077B6] focus:bg-white transition-colors"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => { setQuery(''); setHighlighted(-1); inputRef.current?.focus(); }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-[#94A3B8] hover:text-[#0F172A] transition-colors"
                >
                  <X size={11} />
                </button>
              )}
            </div>
          </div>

          {/* Options */}
          <ul ref={listRef} className="max-h-52 overflow-y-auto py-1.5" tabIndex={-1}>
            {filtered.length === 0 ? (
              <li className="px-4 py-5 text-center">
                <p className="text-sm font-semibold text-[#64748B]">Nenhuma especialidade encontrada</p>
                <p className="text-xs text-[#94A3B8] mt-0.5">Tente outro termo de busca</p>
              </li>
            ) : (
              filtered.map((s, i) => {
                const isSelected   = value === s;
                const isHighlighted = highlighted === i;
                return (
                  <li
                    key={s}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(s)}
                    onMouseEnter={() => setHighlighted(i)}
                    className={[
                      'flex items-center gap-2.5 px-3.5 py-2.5 cursor-pointer select-none transition-colors',
                      isHighlighted && !isSelected ? 'bg-[#F0FBFF] text-[#023E8A]' : '',
                      isSelected ? 'bg-[#CAF0F8]/50 text-[#023E8A]' : 'text-[#0F172A]',
                      !isHighlighted && !isSelected ? 'hover:bg-[#F8FAFC]' : '',
                    ].join(' ')}
                  >
                    <span className="w-4 shrink-0 flex items-center justify-center">
                      {isSelected
                        ? <Check size={13} className="text-[#0077B6]" strokeWidth={2.5} />
                        : null}
                    </span>
                    <span className={`text-sm flex-1 ${isSelected ? 'font-semibold' : 'font-medium'}`}>{s}</span>
                  </li>
                );
              })
            )}
          </ul>

          {/* Footer hint */}
          <div className="px-3.5 py-2 border-t border-[#F1F5F9] flex items-center gap-3 text-[10px] font-semibold text-[#94A3B8] tracking-wide">
            <span>↑↓ navegar</span>
            <span>↵ selecionar</span>
            <span>Esc fechar</span>
          </div>
        </div>
      )}
      </div>

      {/* Error message */}
      {error && (
        <p className="mt-1.5 text-xs text-[#EF4444] font-medium flex items-center gap-1">
          {error}
        </p>
      )}
    </div>
  );
}

import React, { useState } from 'react';
import { AlertCircle, MapPin, Hash, Home, Building2, Map, Milestone } from 'lucide-react';

// Endereço estruturado preenchido a partir do CEP. Os campos de localização
// (logradouro, bairro, cidade, estado) são travados — o usuário só informa CEP,
// número, complemento e referência. Isso evita que ele digite uma localização
// divergente do CEP e mande a clínica para o lugar errado no mapa.
export interface AddressValue {
  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  reference: string;
}

export const EMPTY_ADDRESS: AddressValue = {
  cep: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
  reference: '',
};

export function cepMask(value: string): string {
  return value
    .replace(/\D/g, '')
    .slice(0, 8)
    .replace(/^(\d{5})(\d)/, '$1-$2');
}

// Monta o texto de endereço que o backend grava e geocodifica (Nominatim). A
// ordem "logradouro, número - complemento - bairro, cidade - UF, CEP" é um
// endereço postal comum que o Nominatim resolve bem (o CEP ancora o resultado).
// A referência NÃO entra aqui: é uma dica não-postal que confundiria o geocoder,
// por isso é persistida em campo próprio (addressReference).
export function composeAddressText(address: AddressValue): string {
  const street = address.number ? `${address.street}, ${address.number}` : address.street;
  const cityState = [address.city, address.state].filter(Boolean).join(' - ');
  return [street, address.complement, address.neighborhood, cityState, address.cep]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(' - ');
}

interface CepAddressFieldsProps {
  value: AddressValue;
  onChange: (next: AddressValue) => void;
  errors?: { cep?: string; number?: string };
}

export function CepAddressFields({ value, onChange, errors }: CepAddressFieldsProps) {
  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState<string | null>(null);

  function patch(partial: Partial<AddressValue>) {
    onChange({ ...value, ...partial });
  }

  // Ao completar 8 dígitos, busca o endereço no ViaCEP e trava os campos de
  // localização com o que voltou. Best-effort: falha de rede não bloqueia.
  async function handleCepChange(raw: string) {
    const masked = cepMask(raw);
    const digits = masked.replace(/\D/g, '');
    setCepError(null);
    if (digits.length !== 8) {
      patch({ cep: masked, street: '', neighborhood: '', city: '', state: '' });
      return;
    }
    patch({ cep: masked });
    setCepLoading(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await response.json();
      if (data.erro) {
        setCepError('CEP não encontrado.');
        onChange({ ...value, cep: masked, street: '', neighborhood: '', city: '', state: '' });
        return;
      }
      onChange({
        ...value,
        cep: masked,
        street: data.logradouro ?? '',
        neighborhood: data.bairro ?? '',
        city: data.localidade ?? '',
        state: data.uf ?? '',
      });
    } catch {
      setCepError('Não foi possível buscar o CEP agora. Tente novamente.');
    } finally {
      setCepLoading(false);
    }
  }

  const filledByCep = Boolean(value.street || value.city);

  return (
    <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 space-y-4">
      <p className="text-sm font-semibold text-[#0F172A]">Endereço da clínica</p>

      <EditableField
        icon={MapPin}
        label={cepLoading ? 'CEP (buscando…)' : 'CEP'}
        value={value.cep}
        onChange={handleCepChange}
        placeholder="00000-000"
        required
        error={errors?.cep ?? cepError ?? undefined}
      />

      <ReadOnlyField icon={Home} label="Endereço" value={value.street} placeholder="Preenchido pelo CEP" />

      <div className="grid sm:grid-cols-2 gap-4">
        <EditableField
          icon={Hash}
          label="Número"
          value={value.number}
          onChange={(v) => patch({ number: v.replace(/\D/g, '') })}
          placeholder="123"
          required
          disabled={!filledByCep}
          error={errors?.number}
        />
        <EditableField
          icon={Building2}
          label="Complemento"
          value={value.complement}
          onChange={(v) => patch({ complement: v })}
          placeholder="Sala, andar…"
          disabled={!filledByCep}
        />
      </div>

      <ReadOnlyField icon={Map} label="Bairro" value={value.neighborhood} placeholder="Preenchido pelo CEP" />

      <div className="grid sm:grid-cols-2 gap-4">
        <ReadOnlyField icon={MapPin} label="Cidade" value={value.city} placeholder="Preenchido pelo CEP" />
        <ReadOnlyField icon={MapPin} label="Estado" value={value.state} placeholder="UF" />
      </div>

      <EditableField
        icon={Milestone}
        label="Referência"
        value={value.reference}
        onChange={(v) => patch({ reference: v })}
        placeholder="Ponto de referência (opcional)"
        disabled={!filledByCep}
      />
    </div>
  );
}

function EditableField({
  icon: Icon, label, value, onChange, placeholder, required, disabled, error,
}: {
  icon: React.ElementType; label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; required?: boolean; disabled?: boolean; error?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-[#0F172A] mb-1.5">
        {label}{required && <span className="text-[#EF4444]"> *</span>}
      </label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-[#64748B] pointer-events-none">
          <Icon size={17} />
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className={`w-full h-12 pl-10 pr-4 rounded-xl bg-white border text-[15px] text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-4 transition-all disabled:bg-[#F1F5F9] disabled:text-[#94A3B8] disabled:cursor-not-allowed ${
            error
              ? 'border-[#EF4444] focus:border-[#EF4444] focus:ring-[#FEE2E2]'
              : 'border-[#E2E8F0] focus:border-[#00B4D8] focus:ring-[#CAF0F8]'
          }`}
        />
      </div>
      {error && (
        <p className="mt-1 text-xs text-[#EF4444] flex items-center gap-1">
          <AlertCircle size={12} /> {error}
        </p>
      )}
    </div>
  );
}

// Campo travado: mostra o dado vindo do CEP sem permitir edição.
function ReadOnlyField({
  icon: Icon, label, value, placeholder,
}: {
  icon: React.ElementType; label: string; value: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-[#64748B] mb-1.5">{label}</label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-[#94A3B8] pointer-events-none">
          <Icon size={17} />
        </div>
        <input
          type="text"
          value={value}
          placeholder={placeholder}
          readOnly
          tabIndex={-1}
          aria-readonly="true"
          className="w-full h-12 pl-10 pr-4 rounded-xl bg-[#F1F5F9] border border-[#E2E8F0] text-[15px] text-[#475569] placeholder:text-[#94A3B8] cursor-not-allowed focus:outline-none"
        />
      </div>
    </div>
  );
}

import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from './Button';

interface TextFieldProps {
  label: string;
  icon?: LucideIcon;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  type?: string;
  readOnly?: boolean;
  className?: string;
}

export function TextField({
  label,
  icon: Icon,
  value,
  defaultValue,
  onChange,
  placeholder,
  type = 'text',
  readOnly,
  className,
}: TextFieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label className="text-sm font-medium text-[#475569]">{label}</label>
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
        )}
        <input
          type={type}
          value={value}
          defaultValue={defaultValue}
          onChange={onChange ? (e) => onChange(e.target.value) : undefined}
          placeholder={placeholder}
          readOnly={readOnly}
          className={cn(
            'w-full rounded-xl border border-[#E2E8F0] bg-white py-2.5 text-sm text-[#03045E] outline-none transition',
            'focus:border-[#00B4D8] focus:ring-2 focus:ring-[#00B4D8]/20',
            'disabled:opacity-50 read-only:bg-[#F8FAFC] read-only:text-[#64748B]',
            Icon ? 'pl-9 pr-3' : 'px-3',
          )}
        />
      </div>
    </div>
  );
}

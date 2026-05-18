import React from 'react';
import { Activity } from 'lucide-react';

interface MedicanoLogoProps {
  className?: string;
  iconClassName?: string;
  textClassName?: string;
  inverted?: boolean;
}

export function MedicanoLogo({ className, iconClassName, textClassName, inverted = false }: MedicanoLogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className || ''}`}>
      {/* Símbolo Abstrato: Trocável sem afetar o resto */}
      <div className={`w-8 h-8 rounded-lg ${inverted ? 'bg-white/10' : 'bg-gradient-to-br from-[#023E8A] to-[#00B4D8]'} flex items-center justify-center text-white shrink-0 shadow-sm ${iconClassName || ''}`}>
        <Activity size={20} strokeWidth={2.5} />
      </div>

      {/* Wordmark (Apenas minúsculo) */}
      <span className={`text-2xl font-bold tracking-tight ${inverted ? 'text-white' : 'text-[#03045E]'} mt-0.5 ${textClassName || ''}`}>
        medicano
      </span>
    </div>
  );
}

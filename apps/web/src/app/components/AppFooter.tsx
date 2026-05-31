import React from 'react';
import { ShieldCheck } from 'lucide-react';

export function AppFooter() {
  return (
    <footer className="bg-white border-t border-[#E2E8F0] py-10 px-4 sm:px-8 mt-auto">
      <div className="max-w-[1440px] mx-auto grid md:grid-cols-3 gap-8 text-sm">
        <div>
          <h4 className="font-bold text-[#0F172A] mb-3">Sobre</h4>
          <ul className="space-y-2 text-[#64748B]">
            <li><a href="#" className="hover:text-[#0077B6]">Quem somos</a></li>
            <li><a href="#" className="hover:text-[#0077B6]">Como funciona</a></li>
            <li><a href="#" className="hover:text-[#0077B6]">Para profissionais</a></li>
          </ul>
        </div>
        <div>
          <h4 className="font-bold text-[#0F172A] mb-3">Legal</h4>
          <ul className="space-y-2 text-[#64748B]">
            <li><a href="#" className="hover:text-[#0077B6]">Termos de uso</a></li>
            <li><a href="#" className="hover:text-[#0077B6]">Política de privacidade (LGPD)</a></li>
            <li className="flex items-center gap-1.5 text-[#0F172A]">
              <ShieldCheck size={14} className="text-[#10B981]" /> Em conformidade com CFM
            </li>
          </ul>
        </div>
        <div>
          <h4 className="font-bold text-[#0F172A] mb-3">Suporte</h4>
          <ul className="space-y-2 text-[#64748B]">
            <li><a href="#" className="hover:text-[#0077B6]">Central de ajuda</a></li>
            <li><a href="#" className="hover:text-[#0077B6]">Contato</a></li>
            <li><a href="#" className="hover:text-[#0077B6]">Status do sistema</a></li>
          </ul>
        </div>
      </div>
      <div className="max-w-[1440px] mx-auto pt-8 mt-8 border-t border-[#E2E8F0] flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-[#64748B]">
        <p>© {new Date().getFullYear()} Medicano</p>
        <p className="italic">O Medicano não substitui consulta médica profissional.</p>
      </div>
    </footer>
  );
}

import React, { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router';
import { ChevronDown, LogOut, User, Bell, Settings } from 'lucide-react';
import { MedicanoLogo } from './MedicanoLogo';
import { ConfirmModal } from './ConfirmModal';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';

export function PatientTopbar() {
  const [open, setOpen] = useState(false);
  const [showLogout, setShowLogout] = useState(false);
  const [unread, setUnread] = useState(0);
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  useEffect(() => {
    let active = true;
    api.get('/notifications').then(({ data }) => {
      if (!active) return;
      const list = Array.isArray(data) ? data : (data?.items ?? []);
      setUnread(list.filter((n: any) => !n.read && !n.readAt).length);
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `text-[15px] font-medium transition-colors ${
      isActive ? 'text-[#0077B6]' : 'text-[#64748B] hover:text-[#0077B6]'
    }`;

  return (
    <>
    <nav className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b border-[#E2E8F0]">
      <div className="max-w-[1440px] mx-auto px-8 h-16 flex items-center justify-between">
        <Link to="/"><MedicanoLogo /></Link>

        <div className="hidden md:flex items-center gap-8">
          <NavLink to="/" end className={linkClass}>Início</NavLink>
          <NavLink to="/busca" className={linkClass}>Buscar</NavLink>
          <NavLink to="/triagem" className={linkClass}>Triagem</NavLink>
          <NavLink to="/agendamentos" className={linkClass}>Meus agendamentos</NavLink>
        </div>

        <div className="flex items-center gap-2">
          <NavLink
            to="/notificacoes"
            className={({ isActive }) =>
              `relative w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                isActive ? 'bg-[#CAF0F8]/60 text-[#0077B6]' : 'text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0077B6]'
              }`
            }
            aria-label="Notificações"
          >
            <Bell size={20} />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#EF4444] text-white text-[10px] font-bold flex items-center justify-center border-2 border-white">
                {unread}
              </span>
            )}
          </NavLink>

        <div className="relative">
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-2 rounded-full px-2 py-1.5 hover:bg-[#F8FAFC] transition-colors"
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#48CAE4] to-[#00B4D8] flex items-center justify-center text-white text-sm font-bold">
              {user?.name ? user.name.split(' ').map((n) => n[0]).slice(0, 2).join('') : <User size={18} />}
            </div>
            <ChevronDown size={16} className="text-[#64748B]" />
          </button>
          {open && (
            <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl border border-[#E2E8F0] shadow-lg overflow-hidden">
              {user?.name && (
                <div className="px-4 py-3 border-b border-[#E2E8F0]">
                  <p className="text-sm font-bold text-[#0F172A] truncate">{user.name}</p>
                  {user.email && <p className="text-xs text-[#64748B] truncate">{user.email}</p>}
                </div>
              )}
              <button
                onClick={() => { setOpen(false); navigate('/configuracoes'); }}
                className="w-full flex items-center gap-2 px-4 py-3 text-sm text-[#0F172A] hover:bg-[#F8FAFC]"
              >
                <Settings size={16} className="text-[#64748B]" /> Configurações
              </button>
              <button
                onClick={() => { setOpen(false); setShowLogout(true); }}
                className="w-full flex items-center gap-2 px-4 py-3 text-sm text-[#EF4444] hover:bg-[#FEF2F2]"
              >
                <LogOut size={16} /> Sair
              </button>
            </div>
          )}
        </div>
        </div>
      </div>

    </nav>

    <ConfirmModal
      open={showLogout}
      title="Sair da conta?"
      description="Tem certeza que deseja sair? Você precisará fazer login novamente para acessar sua conta."
      confirmLabel="Sair"
      cancelLabel="Cancelar"
      variant="danger"
      onConfirm={async () => { setShowLogout(false); await logout(); navigate('/'); }}
      onClose={() => setShowLogout(false)}
    />
    </>
  );
}

import React, { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router';
import {
  CalendarDays, Users, CreditCard, Settings, LogOut, Menu, X, UserCog, Bell, Stethoscope,
} from 'lucide-react';
import { MedicanoLogo } from './MedicanoLogo';
import { ConfirmModal } from './ConfirmModal';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [openMobile, setOpenMobile] = useState(false);
  const [showLogout, setShowLogout] = useState(false);
  const [unread, setUnread] = useState(0);
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const role = user?.role ?? 'clinic';
  const roleLabel = role === 'clinic' ? 'Clínica' : role === 'professional' ? 'Profissional' : role === 'attendant' ? 'Atendente' : 'Conta';
  const displayName = user?.name ?? user?.username ?? 'Conta';

  useEffect(() => {
    let active = true;
    api.get('/notifications').then(({ data }) => {
      if (!active) return;
      const list = Array.isArray(data) ? data : (data?.items ?? []);
      setUnread(list.filter((n: any) => !n.read && !n.readAt).length);
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  const items: Array<{ to: string; label: string; icon: any; end?: boolean; roles: string[]; badge?: number }> = [
    { to: '/dashboard', label: 'Agenda', icon: CalendarDays, end: true, roles: ['clinic', 'professional', 'attendant'] },
    { to: '/agendamentos', label: 'Agendamentos', icon: CalendarDays, roles: ['clinic', 'professional', 'attendant'] },
    { to: '/profissionais', label: 'Profissionais', icon: Stethoscope, roles: ['clinic', 'professional', 'attendant'] },
    { to: '/atendentes', label: 'Atendentes', icon: UserCog, roles: ['clinic'] },
    { to: '/notificacoes', label: 'Notificações', icon: Bell, roles: ['clinic', 'professional', 'attendant'], badge: unread },
    { to: '/assinatura', label: 'Assinatura', icon: CreditCard, roles: ['clinic'] },
    { to: '/configuracoes', label: 'Configurações', icon: Settings, roles: ['clinic', 'professional', 'attendant'] },
  ].filter((i) => i.roles.includes(role));

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
      isActive ? 'bg-[#CAF0F8]/40 text-[#03045E]' : 'text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#03045E]'
    }`;

  const SidebarContent = (
    <>
      <div className="px-6 py-6 border-b border-[#E2E8F0]">
        <Link to="/dashboard" onClick={() => setOpenMobile(false)}>
          <MedicanoLogo />
        </Link>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {items.map((it) => (
          <NavLink key={it.to} to={it.to} end={it.end} className={linkClass} onClick={() => setOpenMobile(false)}>
            <it.icon size={18} />
            <span className="flex-1">{it.label}</span>
            {it.badge && it.badge > 0 ? (
              <span className="ml-auto inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-[#EF4444] text-white text-[11px] font-bold">
                {it.badge}
              </span>
            ) : null}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-[#E2E8F0] p-4">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#023E8A] to-[#00B4D8] flex items-center justify-center text-white text-sm font-bold">
            {displayName.split(' ').map((n) => n[0]).slice(0, 2).join('')}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-[#0F172A] truncate">{displayName}</p>
            <p className="text-xs text-[#64748B] truncate">{roleLabel}</p>
          </div>
        </div>
        <button
          onClick={() => setShowLogout(true)}
          className="mt-2 w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[#64748B] hover:bg-[#FEF2F2] hover:text-[#EF4444] transition-colors"
        >
          <LogOut size={16} /> Sair
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans">
      <div className="lg:hidden sticky top-0 z-30 bg-white border-b border-[#E2E8F0] h-16 px-4 flex items-center justify-between">
        <Link to="/dashboard"><MedicanoLogo /></Link>
        <button onClick={() => setOpenMobile(true)} className="p-2 rounded-lg hover:bg-[#F8FAFC]">
          <Menu size={22} className="text-[#0F172A]" />
        </button>
      </div>

      {openMobile && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-[#03045E]/40 backdrop-blur-sm" onClick={() => setOpenMobile(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-[280px] bg-white flex flex-col">
            <button
              onClick={() => setOpenMobile(false)}
              className="absolute top-5 right-4 p-1.5 rounded-lg text-[#64748B] hover:bg-[#F8FAFC]"
            >
              <X size={20} />
            </button>
            {SidebarContent}
          </aside>
        </div>
      )}

      <div className="flex">
        <aside className="hidden lg:flex flex-col w-[240px] min-h-screen bg-white border-r border-[#E2E8F0] sticky top-0">
          {SidebarContent}
        </aside>
        <main className="flex-1 min-w-0 px-6 lg:px-10 py-8">
          {children}
        </main>
      </div>

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
    </div>
  );
}

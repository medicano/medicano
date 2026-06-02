import React, { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router';
import { ChevronDown, LogOut, User, Bell, Settings, Menu, X } from 'lucide-react';
import { MedicanoLogo } from './MedicanoLogo';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';

export function PatientTopbar() {
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  useEffect(() => {
    let active = true;
    api.get('/notifications').then(({ data }) => {
      if (!active) return;
      const list: Array<{ read?: boolean; readAt?: string | null }> = Array.isArray(data)
        ? data
        : (data?.items ?? []);
      setUnread(list.filter((n) => !n.read && !n.readAt).length);
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `text-[15px] font-medium transition-colors ${
      isActive ? 'text-[#0077B6]' : 'text-[#64748B] hover:text-[#0077B6]'
    }`;

  const mobileLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-4 py-3.5 rounded-xl text-base font-semibold transition-colors ${
      isActive ? 'bg-[#CAF0F8]/50 text-[#0077B6]' : 'text-[#0F172A] hover:bg-[#F8FAFC]'
    }`;

  return (
    <>
      <nav className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b border-[#E2E8F0]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
          <Link to="/"><MedicanoLogo /></Link>

          <div className="hidden md:flex items-center gap-8">
            <NavLink to="/home" end className={linkClass}>Início</NavLink>
            <NavLink to="/search" className={linkClass}>Buscar</NavLink>
            <NavLink to="/assistant" className={linkClass}>Assistente</NavLink>
            <NavLink to="/appointments" className={linkClass}>Meus agendamentos</NavLink>
          </div>

          <div className="flex items-center gap-1">
            <NavLink
              to="/notifications"
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

            <div className="relative hidden md:block">
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
                <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl border border-[#E2E8F0] shadow-lg overflow-hidden z-50">
                  {user?.name && (
                    <div className="px-4 py-3 border-b border-[#E2E8F0]">
                      <p className="text-sm font-bold text-[#0F172A] truncate">{user.name}</p>
                      {user.email && <p className="text-xs text-[#64748B] truncate">{user.email}</p>}
                    </div>
                  )}
                  <button
                    onClick={() => { setOpen(false); navigate('/settings'); }}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm text-[#0F172A] hover:bg-[#F8FAFC]"
                  >
                    <Settings size={16} className="text-[#64748B]" /> Configurações
                  </button>
                  <button
                    onClick={async () => { setOpen(false); await logout(); navigate('/login'); }}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm text-[#0F172A] hover:bg-[#F8FAFC]"
                  >
                    <LogOut size={16} className="text-[#64748B]" /> Sair
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-2 rounded-lg hover:bg-[#F8FAFC] text-[#0F172A]"
              aria-label="Abrir menu"
            >
              <Menu size={22} />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-[#03045E]/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute right-0 top-0 bottom-0 w-[280px] bg-white flex flex-col shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2E8F0]">
              <MedicanoLogo />
              <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-lg text-[#64748B] hover:bg-[#F8FAFC]">
                <X size={20} />
              </button>
            </div>

            {user?.name && (
              <div className="px-5 py-4 border-b border-[#E2E8F0]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#48CAE4] to-[#00B4D8] flex items-center justify-center text-white text-sm font-bold shrink-0">
                    {user.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-[#0F172A] truncate text-sm">{user.name}</p>
                    {user.email && <p className="text-xs text-[#64748B] truncate">{user.email}</p>}
                  </div>
                </div>
              </div>
            )}

            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              <NavLink to="/home" end className={mobileLinkClass} onClick={() => setMobileOpen(false)}>Início</NavLink>
              <NavLink to="/search" className={mobileLinkClass} onClick={() => setMobileOpen(false)}>Buscar</NavLink>
              <NavLink to="/assistant" className={mobileLinkClass} onClick={() => setMobileOpen(false)}>Assistente</NavLink>
              <NavLink to="/appointments" className={mobileLinkClass} onClick={() => setMobileOpen(false)}>Meus agendamentos</NavLink>
              <NavLink to="/notifications" className={mobileLinkClass} onClick={() => setMobileOpen(false)}>
                <span className="flex-1">Notificações</span>
                {unread > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-[#EF4444] text-white text-[11px] font-bold">
                    {unread > 99 ? '99+' : unread}
                  </span>
                )}
              </NavLink>
            </nav>

            <div className="border-t border-[#E2E8F0] p-3 space-y-1">
              <button
                onClick={() => { setMobileOpen(false); navigate('/settings'); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-[#0F172A] hover:bg-[#F8FAFC] transition-colors"
              >
                <Settings size={17} className="text-[#64748B]" /> Configurações
              </button>
              <button
                onClick={async () => { setMobileOpen(false); await logout(); navigate('/login'); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#EF4444] transition-colors"
              >
                <LogOut size={17} /> Sair
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}

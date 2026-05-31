import React, { useMemo } from 'react';
import { CheckCheck, CalendarCheck, XCircle, BellRing, Bell, Inbox, CalendarPlus } from 'lucide-react';
import { DashboardLayout } from '../components/DashboardLayout';
import { PatientTopbar } from '../components/PatientTopbar';
import { AppFooter } from '../components/AppFooter';
import { Button } from '../components/ui/Button';
import { formatRelative, type NotificationType } from '../components/notifications-data';
import { useApi, extractList } from '../lib/hooks';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

const typeStyle: Record<NotificationType, { icon: React.ComponentType<any>; bg: string; fg: string }> = {
  CONFIRMED: { icon: CalendarCheck, bg: 'bg-[#A7F3D0]', fg: 'text-[#065F46]' },
  CANCELLED: { icon: XCircle, bg: 'bg-[#FEE2E2]', fg: 'text-[#B91C1C]' },
  REMINDER: { icon: BellRing, bg: 'bg-[#CAF0F8]', fg: 'text-[#0077B6]' },
  NEW_BOOKING: { icon: CalendarPlus, bg: 'bg-[#EDE9FE]', fg: 'text-[#5B21B6]' },
};

export function NotificationsPage() {
  const { user } = useAuth();
  const role = user?.role ?? 'patient';

  const notifsApi = useApi<any[]>('/notifications');
  const items = extractList(notifsApi.data);
  const unread = useMemo(() => items.filter((i) => !i.read).length, [items]);

  async function markAllRead() {
    try {
      await api.put('/notifications/read-all');
      notifsApi.refetch();
    } catch (e) { console.error(e); }
  }

  async function toggleRead(id: string, currentRead: boolean) {
    try {
      await api.put(`/notifications/${id}/read`, { read: !currentRead });
      notifsApi.refetch();
    } catch (e) { console.error(e); }
  }

  function getStyle(type: string) {
    return typeStyle[type as NotificationType] ?? typeStyle.REMINDER;
  }

  const content = (
    <>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-[#03045E] tracking-tight">Notificações</h1>
          <p className="text-[#64748B] mt-1 text-sm">
            {notifsApi.loading
              ? 'Carregando…'
              : unread > 0
              ? <><span className="font-bold">{unread}</span> não {unread === 1 ? 'lida' : 'lidas'}</>
              : 'Você está em dia.'}
          </p>
        </div>
        <Button variant="outline" className="gap-2" disabled={unread === 0 || notifsApi.loading} onClick={markAllRead}>
          <CheckCheck size={16} /> Marcar todas como lidas
        </Button>
      </div>

      {notifsApi.loading ? (
        <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="h-20 bg-[#F8FAFC] rounded-2xl animate-pulse" />)}</div>
      ) : items.length === 0 ? (
        <div className="bg-white border border-[#E2E8F0] rounded-3xl p-12 text-center">
          <div className="w-20 h-20 rounded-3xl bg-[#CAF0F8] flex items-center justify-center mx-auto mb-6">
            <Inbox size={36} className="text-[#0077B6]" />
          </div>
          <h2 className="text-2xl font-bold text-[#03045E]">Nenhuma notificação por aqui</h2>
          <p className="text-[#64748B] mt-2 max-w-md mx-auto">
            Quando houver novidades sobre seus agendamentos, elas aparecerão aqui.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((n) => {
            const t = getStyle(n.type);
            const Icon = t.icon;
            const createdAt = n.createdAt ? new Date(n.createdAt) : new Date();
            return (
              <button
                type="button"
                key={n.id}
                onClick={() => toggleRead(n.id, !!n.read)}
                className={`w-full text-left bg-white border rounded-2xl p-5 transition-all hover:shadow-md flex items-start gap-4 ${
                  n.read ? 'border-[#E2E8F0]' : 'border-[#00B4D8]/40 bg-[#F0FBFF]/60'
                }`}
              >
                <div className={`w-11 h-11 rounded-xl ${t.bg} ${t.fg} flex items-center justify-center shrink-0`}>
                  <Icon size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-bold text-[#03045E]">{n.title}</p>
                    {!n.read && <span className="mt-1.5 w-2 h-2 rounded-full bg-[#00B4D8] shrink-0" />}
                  </div>
                  <p className="text-sm text-[#64748B] mt-1">{n.message}</p>
                  <p className="text-xs text-[#94A3B8] mt-2">{formatRelative(createdAt)}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </>
  );

  if (role === 'patient') {
    return (
      <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
        <PatientTopbar />
        <main className="flex-1 max-w-[900px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">{content}</main>
        <AppFooter />
      </div>
    );
  }

  return (
    <DashboardLayout>
      {content}
    </DashboardLayout>
  );
}

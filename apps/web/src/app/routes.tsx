import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { CadastroPage } from './pages/CadastroPage';
import { TriagemListPage } from './pages/TriagemListPage';
import { TriagemChatPage } from './pages/TriagemChatPage';
import { AgendamentosPage } from './pages/AgendamentosPage';
import { DashboardPage } from './pages/DashboardPage';
import { AppointmentDetailPage } from './pages/AppointmentDetailPage';
import { ProfissionaisPage } from './pages/ProfissionaisPage';
import { AssinaturaPage } from './pages/AssinaturaPage';
import { SearchPage } from './pages/SearchPage';
import { BookingPage } from './pages/BookingPage';
import { BookingSuccessPage } from './pages/BookingSuccessPage';
import { HomePage } from './pages/HomePage';
import { ConfiguracoesPage } from './pages/ConfiguracoesPage';
import { AtendentesPage } from './pages/AtendentesPage';
import { NotificacoesPage } from './pages/NotificacoesPage';
import { ClinicProfilePage } from './pages/ClinicProfilePage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useAuth } from './contexts/AuthContext';

function RootPage() {
  const { isAuthenticated, user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="flex items-center gap-3 text-[#0077B6]">
          <span className="w-3 h-3 rounded-full bg-[#0077B6] animate-pulse" />
          <span className="font-semibold">Carregando...</span>
        </div>
      </div>
    );
  }
  if (!isAuthenticated) return <LandingPage />;
  if (user?.role === 'patient') return <HomePage />;
  return <Navigate to="/dashboard" replace />;
}

const patient = (el: React.ReactNode) => <ProtectedRoute roles={['patient']}>{el}</ProtectedRoute>;
const staff = (el: React.ReactNode) => <ProtectedRoute roles={['clinic', 'professional', 'attendant']}>{el}</ProtectedRoute>;
const clinicOnly = (el: React.ReactNode) => <ProtectedRoute roles={['clinic']}>{el}</ProtectedRoute>;
const anyAuth = (el: React.ReactNode) => <ProtectedRoute>{el}</ProtectedRoute>;

export const router = createBrowserRouter([
  // Root — smart: LandingPage se não autenticado, HomePage se paciente, /dashboard se staff
  { path: '/', element: <RootPage /> },
  { path: '/login', Component: LoginPage },
  { path: '/cadastro', Component: CadastroPage },

  // Patient
  { path: '/busca', element: patient(<SearchPage />) },
  { path: '/clinica/:clinicId', element: patient(<ClinicProfilePage />) },
  { path: '/agendar/sucesso', element: patient(<BookingSuccessPage />) },
  { path: '/agendar/:professionalId', element: patient(<BookingPage />) },
  { path: '/triagem', element: patient(<TriagemListPage />) },
  { path: '/triagem/:sessionId', element: patient(<TriagemChatPage />) },

  // Shared (paciente vê seus próprios, staff vê os da clínica)
  { path: '/agendamentos', element: anyAuth(<AgendamentosPage />) },
  { path: '/agendamentos/:id', element: anyAuth(<AppointmentDetailPage />) },
  { path: '/notificacoes', element: anyAuth(<NotificacoesPage />) },
  { path: '/configuracoes', element: anyAuth(<ConfiguracoesPage />) },

  // Staff
  { path: '/dashboard', element: staff(<DashboardPage />) },
  { path: '/profissionais', element: staff(<ProfissionaisPage />) },
  { path: '/atendentes', element: clinicOnly(<AtendentesPage />) },
  { path: '/assinatura', element: clinicOnly(<AssinaturaPage />) },

  // Legacy redirects (manter retrocompatibilidade)
  { path: '/home', element: <Navigate to="/" replace /> },
  { path: '/signup', element: <Navigate to="/cadastro" replace /> },
  { path: '/search', element: <Navigate to="/busca" replace /> },
  { path: '/booking', element: <Navigate to="/busca" replace /> },
  { path: '/booking/success', element: <Navigate to="/agendar/sucesso" replace /> },
  { path: '/triage', element: <Navigate to="/triagem" replace /> },
  { path: '/triage/:sessionId', element: <Navigate to="/triagem/:sessionId" replace /> },
  { path: '/appointments', element: <Navigate to="/agendamentos" replace /> },
  { path: '/dashboard/appointment/:id', element: <Navigate to="/agendamentos/:id" replace /> },
  { path: '/dashboard/professionals', element: <Navigate to="/profissionais" replace /> },
  { path: '/dashboard/subscription', element: <Navigate to="/assinatura" replace /> },
  { path: '/dashboard/settings', element: <Navigate to="/configuracoes" replace /> },

  // 404
  { path: '*', element: <Navigate to="/" replace /> },
]);

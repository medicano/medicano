import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { TriageListPage } from './pages/TriageListPage';
import { TriageChatPage } from './pages/TriageChatPage';
import { AppointmentsPage } from './pages/AppointmentsPage';
import { DashboardPage } from './pages/DashboardPage';
import { AppointmentDetailPage } from './pages/AppointmentDetailPage';
import { ProfessionalsPage } from './pages/ProfessionalsPage';
import { SubscriptionPage } from './pages/SubscriptionPage';
import { SearchPage } from './pages/SearchPage';
import { BookingPage } from './pages/BookingPage';
import { BookingSuccessPage } from './pages/BookingSuccessPage';
import { HomePage } from './pages/HomePage';
import { SettingsPage } from './pages/SettingsPage';
import { AttendantsPage } from './pages/AttendantsPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { ClinicProfilePage } from './pages/ClinicProfilePage';
import { AvailabilityPage } from './pages/AvailabilityPage';
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
  if (user?.role === 'patient') return <Navigate to="/home" replace />;
  return <Navigate to="/dashboard" replace />;
}

const patient = (el: React.ReactNode) => <ProtectedRoute roles={['patient']}>{el}</ProtectedRoute>;
const staff = (el: React.ReactNode) => <ProtectedRoute roles={['clinic', 'professional', 'attendant']}>{el}</ProtectedRoute>;
const clinicOnly = (el: React.ReactNode) => <ProtectedRoute roles={['clinic']}>{el}</ProtectedRoute>;
const clinicOrPro = (el: React.ReactNode) => <ProtectedRoute roles={['clinic', 'professional']}>{el}</ProtectedRoute>;
const anyAuth = (el: React.ReactNode) => <ProtectedRoute>{el}</ProtectedRoute>;

export const router = createBrowserRouter([
  // Root — shows LandingPage if unauthenticated, redirects based on role otherwise
  { path: '/', element: <RootPage /> },
  { path: '/login', Component: LoginPage },
  { path: '/register', Component: RegisterPage },

  // Patient
  { path: '/home', element: patient(<HomePage />) },
  { path: '/search', element: patient(<SearchPage />) },
  { path: '/clinic/:clinicId', element: patient(<ClinicProfilePage />) },
  { path: '/book/success', element: patient(<BookingSuccessPage />) },
  { path: '/book/:professionalId', element: patient(<BookingPage />) },
  { path: '/triage', element: patient(<TriageListPage />) },
  { path: '/triage/:sessionId', element: patient(<TriageChatPage />) },

  // Shared
  { path: '/appointments', element: anyAuth(<AppointmentsPage />) },
  { path: '/appointments/:id', element: anyAuth(<AppointmentDetailPage />) },
  { path: '/notifications', element: anyAuth(<NotificationsPage />) },
  { path: '/settings', element: anyAuth(<SettingsPage />) },

  // Staff
  { path: '/dashboard', element: staff(<DashboardPage />) },
  { path: '/professionals', element: staff(<ProfessionalsPage />) },
  { path: '/availability', element: clinicOrPro(<AvailabilityPage />) },
  { path: '/attendants', element: clinicOnly(<AttendantsPage />) },
  { path: '/subscription', element: clinicOnly(<SubscriptionPage />) },

  // Legacy redirects
  { path: '/signup', element: <Navigate to="/register" replace /> },
  { path: '/booking', element: <Navigate to="/search" replace /> },
  { path: '/booking/success', element: <Navigate to="/book/success" replace /> },
  { path: '/dashboard/appointment/:id', element: <Navigate to="/appointments/:id" replace /> },
  { path: '/dashboard/professionals', element: <Navigate to="/professionals" replace /> },
  { path: '/dashboard/subscription', element: <Navigate to="/subscription" replace /> },
  { path: '/dashboard/settings', element: <Navigate to="/settings" replace /> },

  // 404
  { path: '*', element: <Navigate to="/" replace /> },
]);

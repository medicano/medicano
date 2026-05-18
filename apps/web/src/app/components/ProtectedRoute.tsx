import React from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAuth, type UserRole } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: UserRole[];
}

export function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

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

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (roles && user && !roles.includes(user.role)) {
    const fallback = user.role === 'patient' ? '/' : '/dashboard';
    return <Navigate to={fallback} replace />;
  }

  return <>{children}</>;
}

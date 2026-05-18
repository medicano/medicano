import React from 'react';
import { RouterProvider } from 'react-router';
import { router } from './routes';
import { ToastProvider } from './components/Toast';
import { AuthProvider } from './contexts/AuthContext';

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </AuthProvider>
  );
}

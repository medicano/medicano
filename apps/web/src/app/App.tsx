import React from 'react';
import { RouterProvider } from 'react-router';
import { SWRConfig } from 'swr';
import { Toaster } from 'sonner';
import { router } from './routes';
import { ToastProvider } from './components/Toast';
import { AuthProvider } from './contexts/AuthContext';
import { api } from './lib/api';

const swrFetcher = (url: string) => api.get(url).then((res) => res.data);

export default function App() {
  return (
    <SWRConfig value={{ fetcher: swrFetcher }}>
      <AuthProvider>
        <ToastProvider>
          <RouterProvider router={router} />
          <Toaster richColors position="top-right" closeButton />
        </ToastProvider>
      </AuthProvider>
    </SWRConfig>
  );
}

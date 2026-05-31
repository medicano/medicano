import React from 'react';
import { RouterProvider } from 'react-router';
import { SWRConfig } from 'swr';
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
        </ToastProvider>
      </AuthProvider>
    </SWRConfig>
  );
}

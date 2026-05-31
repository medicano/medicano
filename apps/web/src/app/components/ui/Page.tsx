import React from 'react';
import { DashboardLayout } from '../DashboardLayout';

interface PageProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function Page({ title, description, children }: PageProps) {
  return (
    <DashboardLayout>
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#03045E]">{title}</h1>
          {description && (
            <p className="mt-1 text-sm text-foreground-muted">{description}</p>
          )}
        </div>
        {children}
      </div>
    </DashboardLayout>
  );
}

import React from 'react';
import { Link } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { DashboardLayout } from '../DashboardLayout';

interface PageProps {
  title: string;
  description?: string;
  backTo?: string;
  children: React.ReactNode;
}

export function Page({ title, description, backTo, children }: PageProps) {
  return (
    <DashboardLayout>
      <div className="mx-auto max-w-3xl px-4 py-8">
        {backTo && (
          <Link
            to={backTo}
            className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#0077B6] transition-colors hover:text-[#023E8A]"
          >
            <ArrowLeft size={16} /> Voltar
          </Link>
        )}
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

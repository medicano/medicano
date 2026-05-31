import React from 'react';
import { cn } from './Button';

interface SectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function Section({ title, description, children, className }: SectionProps) {
  return (
    <div className={cn('rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-sm', className)}>
      <h2 className={cn('text-lg font-semibold text-[#03045E]', description ? 'mb-1' : 'mb-6')}>
        {title}
      </h2>
      {description && (
        <p className="mb-6 text-sm text-foreground-muted">{description}</p>
      )}
      {children}
    </div>
  );
}

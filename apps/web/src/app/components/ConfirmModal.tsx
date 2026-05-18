import React from 'react';
import { X } from 'lucide-react';
import { Button } from './ui/Button';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'primary' | 'danger';
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'primary',
  onConfirm,
  onClose
}: ConfirmModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#03045E]/40 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-[#E2E8F0]">
        <div className="flex items-start justify-between p-6 pb-2">
          <h3 className="text-lg font-bold text-[#03045E]">{title}</h3>
          <button onClick={onClose} className="text-[#64748B] hover:text-[#0F172A]">
            <X size={20} />
          </button>
        </div>
        {description && <p className="px-6 text-sm text-[#64748B] leading-relaxed">{description}</p>}
        <div className="flex items-center justify-end gap-3 p-6 pt-6">
          <Button variant="outline" onClick={onClose}>{cancelLabel}</Button>
          {variant === 'danger' ? (
            <button
              onClick={onConfirm}
              className="h-11 px-6 rounded-xl bg-[#EF4444] hover:bg-[#DC2626] text-white font-medium transition-colors"
            >
              {confirmLabel}
            </button>
          ) : (
            <Button variant="primary" onClick={onConfirm}>{confirmLabel}</Button>
          )}
        </div>
      </div>
    </div>
  );
}

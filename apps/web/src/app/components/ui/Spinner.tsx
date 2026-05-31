import { cn } from './Button';

interface SpinnerProps {
  className?: string;
}

export function Spinner({ className }: SpinnerProps) {
  return (
    <div
      className={cn(
        'h-6 w-6 animate-spin rounded-full border-2 border-[#E2E8F0] border-t-[#10B981]',
        className,
      )}
    />
  );
}

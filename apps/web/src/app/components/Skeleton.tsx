import React from 'react';

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-[#E2E8F0] rounded-md animate-pulse ${className}`} />;
}

export function CardSkeleton() {
  return (
    <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="w-11 h-11 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
    </div>
  );
}

export function CardListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

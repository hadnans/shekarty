import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Loading({ className, size = 24 }: { className?: string; size?: number }) {
  return (
    <div className={cn("flex items-center justify-center p-4", className)}>
      <Loader2 size={size} className="animate-spin text-primary-600" />
    </div>
  );
}

export function LoadingPage() {
  return (
    <div className="flex h-[50vh] w-full items-center justify-center">
      <Loading size={48} />
    </div>
  );
}

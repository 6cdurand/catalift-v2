/**
 * LoadingState — Shared loading state component with spinner.
 * Phase-2 Lane 1: Reusable loading display.
 */

import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = 'Loading...' }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] px-6 py-12">
      <Loader2 className="w-8 h-8 text-gray-400 animate-spin mb-4" />
      <p className="text-sm text-gray-500">{message}</p>
    </div>
  );
}

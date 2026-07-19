/**
 * EmptyState — Shared empty state component for Feed/Community/etc.
 * Phase-2 Lane 1: Polished "coming soon" variant for unbuilt features.
 */

import { type LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  variant?: 'default' | 'coming-soon';
  accentColor?: 'sky' | 'rose' | 'purple' | 'amber';
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  variant = 'default',
  accentColor = 'sky',
}: EmptyStateProps) {
  const accentClasses = {
    sky: 'text-sky-500 bg-sky-50',
    rose: 'text-rose-500 bg-rose-50',
    purple: 'text-purple-500 bg-purple-50',
    amber: 'text-amber-500 bg-amber-50',
  };

  const accent = accentClasses[accentColor];

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] px-6 py-12">
      <div className={`w-16 h-16 rounded-full ${accent} flex items-center justify-center mb-4`}>
        <Icon className="w-8 h-8" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2 text-center">{title}</h3>
      {description && (
        <p className="text-sm text-gray-500 text-center max-w-sm">{description}</p>
      )}
      {variant === 'coming-soon' && (
        <div className="mt-6 px-4 py-2 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-400 text-center">On the roadmap</p>
        </div>
      )}
    </div>
  );
}

'use client';

// /program/builder route — Program builder wizard (w2a)

import { Suspense } from 'react';
// eslint-disable-next-line no-restricted-imports -- app/ pages may import from features
import { useSession, readUserMode } from '@/features/auth';
// eslint-disable-next-line no-restricted-imports -- app/ pages may import from features
import { ProgramBuilder } from '@/features/programs/builder/ProgramBuilder';

function BuilderLoading() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-gray-500">Loading program builder...</div>
    </div>
  );
}

function ProgramBuilderContent() {
  const { user, loading } = useSession();

  if (loading) return <BuilderLoading />;
  if (!user) {
    // Redirect to login handled by useSession/redirect-guard
    return null;
  }

  // Derive trainer mode from user metadata (same source the rest of v2 uses)
  const isTrainerMode = readUserMode(user.user_metadata) === 'trainer';

  return <ProgramBuilder isTrainerMode={isTrainerMode} />;
}

export default function ProgramBuilderPage() {
  return (
    <Suspense fallback={<BuilderLoading />}>
      <ProgramBuilderContent />
    </Suspense>
  );
}

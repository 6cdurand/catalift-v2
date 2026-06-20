"use client";

import { useSession, logout } from "@/features/auth";

export default function Home() {
  const { user, loading } = useSession();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-zinc-500">Loading…</p>
      </div>
    );
  }

  if (user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Welcome, {user.email}
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              You&apos;re signed in to Catalift
            </p>
          </div>
          <button
            onClick={() => logout()}
            className="w-full rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Log out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-8 text-center">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Catalift</h1>
          <p className="mt-2 text-sm text-zinc-500">
            Coaching operating system for personal trainers
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <a
            href="/login"
            className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Log in
          </a>
          <a
            href="/signup"
            className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Sign up
          </a>
        </div>
      </div>
    </div>
  );
}

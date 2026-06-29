"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AuthShellProps {
  active: "login" | "register";
  children: ReactNode;
}

/**
 * Branded auth shell — ports v1 `auth/page.tsx` look VERBATIM onto v2's
 * backend (G-19).
 *
 * v1 was a single `/auth` page with in-page tabs; v2 splits it into `/login`
 * and `/signup` routes, so the tabs are <Link>-backed (TabsTrigger asChild) —
 * real anchors, no client-router dependency, no hydration race.
 *
 * Design tweaks (Christo): header is the plain word "Catalift" — the
 * `<CataliftLogo/>` dumbbell/brand lockup is REMOVED (tweak #2). The sky
 * hero + slate-900 card palette is ported verbatim from v1 (tweak #3).
 */
export function AuthShell({ active, children }: AuthShellProps) {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col overflow-auto">
      {/* Hero Section (v1 verbatim, logo → "Catalift" text) */}
      <div className="relative bg-gradient-to-br from-sky-600 via-sky-500 to-sky-400 px-6 pt-16 pb-12 flex-shrink-0 overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_30%_20%,white_1px,transparent_1px)] bg-[length:32px_32px]" />
        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -top-12 -left-12 w-48 h-48 bg-sky-500/20 rounded-full blur-3xl" />
        <div className="relative z-10 max-w-md mx-auto text-center">
          <span className="text-4xl font-bold tracking-tight text-white">
            Catalift
          </span>
        </div>
      </div>

      {/* Auth Card */}
      <div className="flex-1 px-5 py-8 -mt-6">
        <div className="max-w-md mx-auto bg-slate-900/95 border border-slate-800/50 shadow-2xl shadow-black/50 backdrop-blur-sm rounded-2xl p-6">
          <Tabs value={active}>
            <TabsList className="grid w-full grid-cols-2 bg-slate-800/50 rounded-xl p-1">
              <TabsTrigger
                value="login"
                asChild
                className="rounded-lg text-gray-300 data-[state=active]:bg-sky-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-sky-500/20 transition-all duration-200"
              >
                <Link href="/login">Sign In</Link>
              </TabsTrigger>
              <TabsTrigger
                value="register"
                asChild
                className="rounded-lg text-gray-300 data-[state=active]:bg-sky-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-sky-500/20 transition-all duration-200"
              >
                <Link href="/signup">Create Account</Link>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}

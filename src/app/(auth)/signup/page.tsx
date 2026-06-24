"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { getBrowserClient } from "@/lib/supabase";
import {
  AuthShell,
  syncUserModeToProfile,
  type UserRole,
} from "@/features/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("client");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = getBrowserClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // `mode` is the app's source of truth for role
        // (see components/layouts/_shell-stubs.ts).
        data: { mode: role },
        emailRedirectTo:
          typeof window !== "undefined"
            ? `${window.location.origin}/callback`
            : undefined,
      },
    });

    if (error) {
      setLoading(false);
      setError(error.message);
      return;
    }

    // If email confirmation is disabled, signUp returns a live session — mirror
    // the chosen role into the profile row now (best-effort). Otherwise the
    // mirror happens on first login.
    if (data.session && data.user) {
      try {
        await syncUserModeToProfile(data.user.id, role);
      } catch {
        // Already logged + retried; non-blocking.
      }
      router.push("/");
      router.refresh();
      return;
    }

    setLoading(false);
    setSuccess(true);
  }

  if (success) {
    return (
      <AuthShell active="register">
        <div className="space-y-4 text-center">
          <h1 className="text-xl font-semibold tracking-tight text-gray-900">
            Check your email
          </h1>
          <p className="text-sm text-gray-500">
            We&apos;ve sent you a confirmation link. Click it to verify your
            account.
          </p>
          <Button
            variant="link"
            onClick={() => router.push("/login")}
            className="w-full"
          >
            Back to login
          </Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell active="register">
      <div className="space-y-2 text-center">
        <h1 className="text-xl font-semibold tracking-tight text-gray-900">
          Create your account
        </h1>
        <p className="text-sm text-gray-500">Ignite your rise with Catalift</p>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <Label>I am a</Label>
          <div
            role="radiogroup"
            aria-label="Account role"
            className="grid grid-cols-2 gap-2"
          >
            <button
              type="button"
              role="radio"
              aria-checked={role === "client"}
              onClick={() => setRole("client")}
              className={cn(
                "rounded-[10px] border px-4 py-2.5 text-sm font-medium transition-all",
                role === "client"
                  ? "border-sky-500 bg-sky-50 text-sky-700 shadow-sm"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300",
              )}
            >
              Client
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={role === "trainer"}
              onClick={() => setRole("trainer")}
              className={cn(
                "rounded-[10px] border px-4 py-2.5 text-sm font-medium transition-all",
                role === "trainer"
                  ? "border-rose-500 bg-rose-50 text-rose-700 shadow-sm"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300",
              )}
            >
              Trainer
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Creating account…" : "Sign up"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Already have an account?{" "}
        <a href="/login" className="font-medium text-sky-600 hover:text-sky-500">
          Log in
        </a>
      </p>
    </AuthShell>
  );
}

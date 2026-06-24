"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { getBrowserClient } from "@/lib/supabase";
import { AuthShell, readUserMode, syncUserModeToProfile } from "@/features/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = getBrowserClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setLoading(false);
      setError(error.message);
      return;
    }

    // Reconcile the DB profile role with the auth-metadata mode (set at
    // signup). Source of truth is metadata; this mirror is best-effort and
    // must never block login.
    const user = data.user;
    if (user) {
      try {
        await syncUserModeToProfile(user.id, readUserMode(user.user_metadata));
      } catch {
        // Already logged + retried in syncUserModeToProfile; non-blocking.
      }
    }

    router.push("/");
    router.refresh();
  }

  return (
    <AuthShell active="login">
      <div className="space-y-2 text-center">
        <h1 className="text-xl font-semibold tracking-tight text-gray-900">
          Welcome back
        </h1>
        <p className="text-sm text-gray-500">Log in to continue your rise</p>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
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
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <a
              href="/reset-password"
              className="text-sm font-medium text-sky-600 hover:text-sky-500"
            >
              Forgot password?
            </a>
          </div>
          <Input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Logging in…" : "Log in"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Don&apos;t have an account?{" "}
        <a
          href="/signup"
          className="font-medium text-sky-600 hover:text-sky-500"
        >
          Sign up
        </a>
      </p>
    </AuthShell>
  );
}

"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { getBrowserClient } from "@/lib/supabase";
import { AuthShell } from "@/features/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    // The recovery link establishes a session (handled by detectSessionInUrl);
    // updateUser then sets the new password on Supabase Auth.
    const supabase = getBrowserClient();
    const { error } = await supabase.auth.updateUser({ password });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setDone(true);
  }

  if (done) {
    return (
      <AuthShell active="login">
        <div className="space-y-4 text-center">
          <h1 className="text-xl font-semibold tracking-tight text-gray-900">
            Password updated
          </h1>
          <p className="text-sm text-gray-500">
            Your password has been changed. You can now log in with it.
          </p>
          <Button className="w-full" onClick={() => router.push("/login")}>
            Go to login
          </Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell active="login">
      <div className="space-y-2 text-center">
        <h1 className="text-xl font-semibold tracking-tight text-gray-900">
          Set a new password
        </h1>
        <p className="text-sm text-gray-500">
          Choose a strong password for your account
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="password">New password</Label>
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

        <div className="space-y-1.5">
          <Label htmlFor="confirm">Confirm password</Label>
          <Input
            id="confirm"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Updating…" : "Update password"}
        </Button>
      </form>
    </AuthShell>
  );
}

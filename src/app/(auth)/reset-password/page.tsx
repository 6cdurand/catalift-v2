"use client";

import { useState, type FormEvent } from "react";
import { getBrowserClient } from "@/lib/supabase";
import { AuthShell } from "@/features/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const supabase = getBrowserClient();
    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/update-password`
        : undefined;

    // Fire the recovery email. We intentionally ignore the result for the UI:
    // showing a neutral confirmation regardless prevents account enumeration.
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    if (error) {
      console.error("resetPasswordForEmail failed:", error.message);
    }

    setLoading(false);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <AuthShell active="login">
        <div className="space-y-4 text-center">
          <h1 className="text-xl font-semibold tracking-tight text-gray-900">
            Check your email
          </h1>
          <p className="text-sm text-gray-500">
            If an account exists for that address, we&apos;ve sent a link to
            reset your password.
          </p>
          <Button variant="link" className="w-full" asChild>
            <a href="/login">Back to login</a>
          </Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell active="login">
      <div className="space-y-2 text-center">
        <h1 className="text-xl font-semibold tracking-tight text-gray-900">
          Reset your password
        </h1>
        <p className="text-sm text-gray-500">
          Enter your email and we&apos;ll send you a reset link
        </p>
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

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Sending…" : "Send reset link"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Remembered it?{" "}
        <a href="/login" className="font-medium text-sky-600 hover:text-sky-500">
          Log in
        </a>
      </p>
    </AuthShell>
  );
}

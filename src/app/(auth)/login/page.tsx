"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getBrowserClient } from "@/lib/supabase";
import { AuthShell } from "@/features/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// v1 surfaced a neutral confirmation copy from `@/lib/passwordRecovery`
// (NEUTRAL_REQUEST_RESPONSE) — inlined here. Supabase Auth returns 200 even
// for unknown emails, so the same message shows regardless: enumeration-safe.
const NEUTRAL_REQUEST_MESSAGE =
  "If an account exists for that email, a recovery link is on its way.";

/**
 * Login — v1 `auth/page.tsx` login tab + forgot-password modal, ported
 * VERBATIM (G-19). Only the data seam changed:
 *   v1: `useAuthStore().login()` (localStorage + client-side password hashing)
 *   v2: `getBrowserClient().auth.signInWithPassword()`  ← Supabase Auth only.
 *
 * DROPPED from v1 (not "design", and they were footguns / out-of-seam):
 *   - "Reset app data" button → wiped the entire localStorage store, evicting
 *     the `sb-*` auth token (INC-003); grep-guard-forbidden (G-03).
 *   - "Continue with Google" (OAuth provider not configured this wave).
 *   - "Continue as Demo User" (relied on the v1 register/login store seam).
 */
export default function LoginPage() {
  const router = useRouter();

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Forgot-password modal state (v1 verbatim).
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [isSubmittingForgot, setIsSubmittingForgot] = useState(false);
  const [forgotSubmitted, setForgotSubmitted] = useState(false);
  const [showTrainerHelp, setShowTrainerHelp] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const supabase = getBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });

    if (error) {
      setIsLoading(false);
      toast.error('Invalid email or password. Did you mean "Forgot password?"');
      return;
    }

    toast.success("Welcome back!");
    router.push("/today");
    router.refresh();
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    const email = forgotEmail.trim();
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email");
      return;
    }

    setIsSubmittingForgot(true);
    try {
      // SEAM kept AS-IS from v1: Supabase Auth's native recovery flow. Emails
      // a recovery link that lands on /update-password with a recovery
      // session; that page calls `supabase.auth.updateUser({ password })`.
      const { error } = await getBrowserClient().auth.resetPasswordForEmail(
        email,
        { redirectTo: `${window.location.origin}/update-password` },
      );

      // Enumeration-safe: 200 even for unknown emails → always show the
      // neutral confirmation. Network/rate-limit errors surface a retry toast.
      if (error) {
        console.error("[auth] resetPasswordForEmail failed:", error.message);
        if ((error.message || "").toLowerCase().includes("rate limit")) {
          toast.error("Too many requests. Please wait a few minutes and try again.");
        } else {
          toast.error("Could not send recovery email. Please try again in a moment.");
        }
        setIsSubmittingForgot(false);
        return;
      }
      setForgotSubmitted(true);
    } catch (err) {
      console.error("[auth] resetPasswordForEmail threw:", err);
      toast.error("Network error. Please try again in a moment.");
    } finally {
      setIsSubmittingForgot(false);
    }
  };

  return (
    <AuthShell active="login">
      <CardHeader className="px-0 pt-0">
        <CardTitle className="text-white">Welcome Back</CardTitle>
        <CardDescription>Sign in to continue your fitness journey</CardDescription>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="login-email" className="text-gray-300">Email</Label>
            <Input
              id="login-email"
              type="email"
              placeholder="your@email.com"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="login-password" className="text-gray-300">Password</Label>
            <Input
              id="login-password"
              type="password"
              placeholder="••••••••"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400"
              required
            />
          </div>
          <Button
            type="submit"
            className="w-full bg-sky-500 hover:bg-sky-600 text-white"
            disabled={isLoading}
          >
            {isLoading ? "Signing in..." : "Sign In"}
          </Button>

          <button
            type="button"
            onClick={() => {
              setForgotEmail(loginEmail);
              setForgotSubmitted(false);
              setShowTrainerHelp(false);
              setShowForgotPassword(true);
            }}
            className="w-full text-center text-xs text-gray-500 hover:text-sky-400 transition-colors mt-1"
          >
            Forgot password?
          </button>
        </form>
      </CardContent>

      {/*
        Recovery request modal (v1 verbatim). The user enters their email; we
        call Supabase Auth's recovery. The modal never collects a password —
        that happens on /update-password after the user clicks the email link.
      */}
      {showForgotPassword && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Reset your password"
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-5"
        >
          <Card className="w-full max-w-md bg-slate-900 border-slate-800 shadow-2xl rounded-2xl">
            <CardHeader>
              <CardTitle className="text-white">Reset Your Password</CardTitle>
              <CardDescription>
                {forgotSubmitted
                  ? "Check your inbox for a recovery link."
                  : "Enter your email and we will send you a recovery link."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!forgotSubmitted ? (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-gray-300">Email</Label>
                    <Input
                      type="email"
                      placeholder="your@email.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400"
                      required
                      disabled={isSubmittingForgot}
                      autoFocus
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-sky-500 hover:bg-sky-600 text-white"
                    disabled={isSubmittingForgot}
                  >
                    {isSubmittingForgot ? "Sending…" : "Send Recovery Link"}
                  </Button>
                  <button
                    type="button"
                    onClick={() => setShowTrainerHelp((v) => !v)}
                    className="w-full text-center text-xs text-gray-400 hover:text-sky-400 transition-colors"
                  >
                    I don&apos;t have access to this email — contact your trainer
                  </button>
                  {showTrainerHelp && (
                    <p className="text-xs text-gray-400 bg-slate-800/60 rounded-md p-3 leading-relaxed">
                      If the email on file is wrong or you no longer have access
                      to it, message your trainer directly. They can update your
                      email from their client-detail screen and re-send the
                      recovery link.
                    </p>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full text-gray-500 hover:text-gray-300 text-sm"
                    onClick={() => {
                      setShowForgotPassword(false);
                      setForgotEmail("");
                      setShowTrainerHelp(false);
                    }}
                    disabled={isSubmittingForgot}
                  >
                    Cancel
                  </Button>
                </form>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-gray-300" data-testid="forgot-confirmation">
                    {NEUTRAL_REQUEST_MESSAGE} The link expires in 1 hour. If it
                    doesn&apos;t arrive in a few minutes, check your spam folder
                    or try again.
                  </p>
                  <Button
                    type="button"
                    className="w-full bg-sky-500 hover:bg-sky-600 text-white"
                    onClick={() => {
                      setShowForgotPassword(false);
                      setForgotSubmitted(false);
                      setForgotEmail("");
                      setShowTrainerHelp(false);
                    }}
                  >
                    Close
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </AuthShell>
  );
}

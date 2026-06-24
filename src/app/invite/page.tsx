"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useSession, verifyInviteToken, acceptInvite } from "@/features/auth";

type Status =
  | "loading"
  | "valid"
  | "invalid"
  | "expired"
  | "accepted"
  | "disabled";

/**
 * Trainer-invite landing — v1 `invite/page.tsx` ported VERBATIM (G-19).
 *
 * Design tweaks: the dumbbell icon + "Catalift FITNESS" lockup become the
 * plain word "Catalift" (tweaks #2/#3).
 *
 * SEAM + SCOPE (Option B): v1's `checkInvitationByToken` / `acceptInvitation`
 * (from the 156KB `supabaseSync` god-file) are replaced by the typed
 * `verifyInviteToken` / `acceptInvite` seam — which is feature-flagged OFF
 * (`FEATURE_FLAGS.invites`) until the `invitations` table lands. While OFF,
 * verification returns `disabled` and the accept path never runs.
 *
 * SECURITY (G-25): setup/accept opens ONLY for a server-verified valid token —
 * never on a bare `?email=` param. There is no `?email=` pre-fill here.
 */
function InvitePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const { user } = useSession();

  const [status, setStatus] = useState<Status>("loading");
  const [inviteData, setInviteData] = useState<{
    trainerId?: string;
    email?: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const verify = async () => {
      if (!token) {
        if (!cancelled) setStatus("invalid");
        return;
      }
      try {
        const result = await verifyInviteToken(token);
        if (cancelled) return;
        if (result.status === "valid") {
          setInviteData({ trainerId: result.trainerId, email: result.email });
          setStatus("valid");
        } else if (result.status === "expired") {
          setStatus("expired");
        } else if (result.status === "disabled") {
          setStatus("disabled");
        } else {
          setStatus("invalid");
        }
      } catch (e) {
        console.error("[Invite] Token check failed:", e);
        // No localStorage fallback, no bare-email setup (G-02/G-03/G-25).
        if (!cancelled) setStatus("invalid");
      }
    };
    verify();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleAcceptInvite = async () => {
    if (!token) return;
    if (user) {
      try {
        await acceptInvite(token, user.id);
        setStatus("accepted");
        setTimeout(() => router.push("/today"), 2000);
      } catch (e) {
        console.error("[Invite] Accept failed:", e);
        setStatus("invalid");
      }
    } else {
      router.push("/login");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Hero (v1 verbatim; dumbbell + "FITNESS" → "Catalift" text) */}
      <div className="relative bg-gradient-to-br from-sky-600 via-sky-500 to-teal-500 px-6 pt-12 pb-8">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_30%_20%,white_1px,transparent_1px)] bg-[length:32px_32px]" />
        <div className="relative z-10 max-w-md mx-auto text-center">
          <h1 className="text-3xl font-bold text-white mb-1">Catalift</h1>
          <p className="text-sky-100">Train Smarter. Get Stronger.</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <Card className="w-full max-w-md bg-slate-900 border-slate-800 shadow-sm">
          <CardHeader className="text-center">
            {status === "loading" && (
              <>
                <Loader2 className="w-12 h-12 text-sky-500 animate-spin mx-auto mb-4" />
                <CardTitle className="text-white">Verifying Invitation</CardTitle>
                <CardDescription>Please wait while we verify your invitation...</CardDescription>
              </>
            )}

            {status === "valid" && (
              <>
                <div className="w-16 h-16 bg-sky-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-sky-500" />
                </div>
                <CardTitle className="text-white">You&apos;re Invited!</CardTitle>
                <CardDescription>
                  Your trainer has invited you to join Catalift to track your workouts and progress.
                </CardDescription>
              </>
            )}

            {status === "invalid" && (
              <>
                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <XCircle className="w-8 h-8 text-red-500" />
                </div>
                <CardTitle className="text-white">Invalid Invitation</CardTitle>
                <CardDescription>
                  This invitation link is invalid or has already been used.
                </CardDescription>
              </>
            )}

            {status === "expired" && (
              <>
                <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <XCircle className="w-8 h-8 text-amber-500" />
                </div>
                <CardTitle className="text-white">Invitation Expired</CardTitle>
                <CardDescription>
                  This invitation has expired. Please ask your trainer to send a new one.
                </CardDescription>
              </>
            )}

            {status === "disabled" && (
              <>
                <div className="w-16 h-16 bg-sky-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Loader2 className="w-8 h-8 text-sky-500" />
                </div>
                <CardTitle className="text-white">Invitations Coming Soon</CardTitle>
                <CardDescription>
                  Invitation links aren&apos;t active yet. Please create an account
                  or sign in, and your trainer can connect with you shortly.
                </CardDescription>
              </>
            )}

            {status === "accepted" && (
              <>
                <div className="w-16 h-16 bg-sky-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-sky-500" />
                </div>
                <CardTitle className="text-white">Welcome to Catalift!</CardTitle>
                <CardDescription>
                  Your account has been linked. Redirecting you to the app...
                </CardDescription>
              </>
            )}
          </CardHeader>

          <CardContent>
            {status === "valid" && (
              <div className="space-y-4">
                {inviteData?.email && (
                  <div className="p-3 bg-slate-800/60 rounded-lg text-center">
                    <p className="text-xs text-gray-400 mb-1">Invitation sent to</p>
                    <p className="text-gray-100 font-medium">{inviteData.email}</p>
                  </div>
                )}

                <Button
                  onClick={handleAcceptInvite}
                  className="w-full bg-sky-500 hover:bg-sky-600 text-white"
                >
                  {user ? "Accept Invitation" : "Sign Up & Accept"}
                </Button>

                {!user && (
                  <p className="text-xs text-gray-400 text-center">
                    Already have an account?{" "}
                    <button
                      onClick={() => router.push("/login")}
                      className="text-sky-400 hover:underline"
                    >
                      Sign in
                    </button>
                  </p>
                )}
              </div>
            )}

            {(status === "invalid" ||
              status === "expired" ||
              status === "disabled") && (
              <Button
                onClick={() => router.push("/signup")}
                variant="outline"
                className="w-full border-slate-700 text-gray-300 hover:bg-slate-800"
              >
                Go to Sign Up
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function InvitePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
          <Loader2 className="w-12 h-12 text-sky-500 animate-spin" />
        </div>
      }
    >
      <InvitePageContent />
    </Suspense>
  );
}

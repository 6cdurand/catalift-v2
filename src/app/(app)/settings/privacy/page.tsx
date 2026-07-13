'use client';

import React, { Suspense, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Key, Database, Download, FileText, ChevronLeft, Mail, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useRequireAuth } from '@/features/auth';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { getBrowserClient } from '@/lib/supabase';
import {
  CHANGE_PASSWORD_COOLDOWN_MS,
  buildDataExportMailto,
} from './helpers';

export {
  PRIVACY_SETTINGS_ROUTE,
  DATA_EXPORT_EMAIL,
  CHANGE_PASSWORD_COOLDOWN_MS,
  buildPasswordRecoveryRequestBody,
  buildDataExportMailto,
} from './helpers';

export default function PrivacySettingsPage() {
  return (
    <Suspense fallback={null}>
      <PrivacySettingsContent />
    </Suspense>
  );
}

function PrivacySettingsContent() {
  const router = useRouter();
  const { user } = useRequireAuth();

  const [isSending, setIsSending] = useState(false);
  const cooldownTimerRef = useRef<number | null>(null);

  React.useEffect(() => {
    return () => {
      if (cooldownTimerRef.current !== null) {
        window.clearTimeout(cooldownTimerRef.current);
      }
    };
  }, []);

  if (!user) return null;

  const handleSendRecoveryLink = async () => {
    if (isSending) return;
    const email = (user.email ?? '').trim();
    if (!email) {
      toast.error('Your account has no email on file. Contact support.');
      return;
    }

    setIsSending(true);
    try {
      const supabase = getBrowserClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) {
        console.error('[settings/privacy] password-recovery request failed:', error);
        toast.error('Something went wrong. Try again later.');
        setIsSending(false);
        return;
      }
      toast.success(`Recovery link sent to ${email}. Check your inbox.`);
      cooldownTimerRef.current = window.setTimeout(() => {
        setIsSending(false);
        cooldownTimerRef.current = null;
      }, CHANGE_PASSWORD_COOLDOWN_MS);
    } catch (err) {
      console.error('[settings/privacy] password-recovery threw:', err);
      toast.error('Something went wrong. Try again later.');
      setIsSending(false);
    }
  };

  const handleEmailMyData = () => {
    window.location.href = buildDataExportMailto(user.email ?? '');
  };

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/settings');
    }
  };

  return (
    <div className="bg-gradient-to-b from-slate-900 via-slate-950 to-black min-h-screen">
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur border-b border-slate-800 px-5 py-4 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleBack}
          className="text-gray-300 hover:text-white hover:bg-slate-800"
          aria-label="Back to Settings"
          data-testid="privacy-back-button"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-lg font-semibold text-white">Privacy &amp; Security</h1>
          <p className="text-xs text-gray-400">Manage your account security and data rights</p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 py-6 space-y-4 pb-24">
        <Card className="bg-white border-gray-200 shadow-sm" data-testid="card-change-password">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <Key className="w-5 h-5 text-sky-500" />
              Change Password
            </CardTitle>
            <CardDescription className="text-gray-500">
              We&apos;ll email you a secure link to set a new password.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full bg-sky-500 hover:bg-sky-600 text-white"
              onClick={handleSendRecoveryLink}
              disabled={isSending}
              data-testid="send-recovery-button"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending…
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Send password recovery link
                </>
              )}
            </Button>
            <p className="mt-2 text-xs text-gray-500">
              For security, we&apos;ll send the link to the email on your account
              ({user.email || 'no email on file'}).
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-200 shadow-sm" data-testid="card-your-data">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <Database className="w-5 h-5 text-sky-500" />
              Your Data
            </CardTitle>
            <CardDescription className="text-gray-500">What we collect</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-gray-700 list-disc list-inside">
              <li>Account info (email, display name, gender, DOB, height, weight)</li>
              <li>Workouts and sets/reps/weights</li>
              <li>Personal bests</li>
              <li>Messages and conversations</li>
              <li>Trainer-client relationships (if applicable)</li>
              <li>Stripe customer id (if payments are active)</li>
              <li>Device and session timestamps</li>
            </ul>
            <p className="mt-4 text-xs text-gray-500">
              All data is stored in Supabase (EU region) and encrypted in transit.
              See the Privacy Policy for retention and sharing details.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-200 shadow-sm" data-testid="card-data-export">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <Download className="w-5 h-5 text-sky-500" />
              Request a Copy of Your Data
            </CardTitle>
            <CardDescription className="text-gray-500">
              Under the NZ Privacy Act 2020 and GDPR Article 15, you can request a
              full copy of your Catalift data at any time.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="w-full border-sky-500 text-sky-600 hover:bg-sky-50"
              onClick={handleEmailMyData}
              data-testid="email-my-data-button"
            >
              <Mail className="w-4 h-4 mr-2" />
              Email me my data
            </Button>
            <p className="mt-2 text-xs text-gray-500">
              We&apos;ll respond within 20 working days.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-200 shadow-sm" data-testid="card-legal">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <FileText className="w-5 h-5 text-sky-500" />
              Legal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link
              href="/legal/privacy"
              className="block text-sm text-sky-600 hover:text-sky-700 underline"
              data-testid="link-privacy-policy"
            >
              Privacy Policy
            </Link>
            <Link
              href="/legal/terms"
              className="block text-sm text-sky-600 hover:text-sky-700 underline"
              data-testid="link-terms-of-service"
            >
              Terms of Service
            </Link>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

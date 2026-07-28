"use client";

// /payments — the all-clients payment tracker. Trainer-only surface: the gate
// mirrors /clients (G-20 role authority — `public.users.role`, never
// `user_metadata.mode`), so a client who types the URL is redirected to /today
// and nothing client-facing ever renders.

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { PageHeader } from "@/components/layouts/MainLayout";
import { useSession, useUserRole } from "@/features/auth";
import { TrainerPaymentsSurface } from "@/features/payments";

export default function PaymentsPage() {
  const router = useRouter();
  const { user, loading: sessionLoading } = useSession();
  const { role, loading: roleLoading } = useUserRole(user?.id);

  const isTrainer = role === "trainer";

  useEffect(() => {
    if (!sessionLoading && !roleLoading && user && !isTrainer) {
      router.replace("/today");
    }
  }, [sessionLoading, roleLoading, user, isTrainer, router]);

  const gateResolved = !sessionLoading && !roleLoading && !!user && isTrainer;

  return (
    <div>
      <PageHeader title="Payments" subtitle="Who owes you what" />
      <div className="px-5 py-4">
        {gateResolved ? (
          <TrainerPaymentsSurface
            onOpenClient={(clientId) => router.push(`/clients/${clientId}`)}
          />
        ) : (
          <p className="text-center text-gray-500">Loading payments…</p>
        )}
      </div>
    </div>
  );
}

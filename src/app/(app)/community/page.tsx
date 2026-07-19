"use client";

import { Users } from "lucide-react";
import { PageHeader } from "@/components/layouts/MainLayout";
import { EmptyState } from "@/components/states";

export default function CommunityPage() {
  return (
    <div>
      <PageHeader title="Community" subtitle="Connect with others" />
      <EmptyState
        icon={Users}
        title="Community is coming soon"
        description="Find training partners, share progress, and connect with the Catalift community"
        variant="coming-soon"
        accentColor="purple"
      />
    </div>
  );
}

"use client";

import { Rss } from "lucide-react";
import { PageHeader } from "@/components/layouts/MainLayout";
import { EmptyState } from "@/components/states";

export default function FeedPage() {
  return (
    <div>
      <PageHeader title="Feed" subtitle="Activity from your community" />
      <EmptyState
        icon={Rss}
        title="Your feed is coming soon"
        description="See workouts, PRs, and updates from your training community"
        variant="coming-soon"
        accentColor="rose"
      />
    </div>
  );
}

"use client";

import { Home } from "lucide-react";
import { PageHeader } from "@/components/layouts/MainLayout";
import { EmptyState } from "@/components/states";

export default function HomePage() {
  return (
    <div>
      <PageHeader title="Home" />
      <EmptyState
        icon={Home}
        title="This page is under construction"
        description="Check out /today for your daily training overview"
        variant="coming-soon"
        accentColor="sky"
      />
    </div>
  );
}

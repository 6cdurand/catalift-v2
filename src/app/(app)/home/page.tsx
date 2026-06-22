"use client";

import { PageHeader } from "@/components/layouts/MainLayout";

export default function HomePage() {
  return (
    <div>
      <PageHeader title="Home" />
      <div className="px-5 py-16 text-center text-gray-500">
        <p className="text-body">This screen is superseded by /today. It will land in a future lane.</p>
      </div>
    </div>
  );
}

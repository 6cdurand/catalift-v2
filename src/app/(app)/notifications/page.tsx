"use client";

import { PageHeader } from "@/components/layouts/MainLayout";

export default function NotificationsPage() {
  return (
    <div>
      <PageHeader title="Notifications" subtitle="Your alerts and updates" showBack />
      <div className="px-5 py-16 text-center text-gray-500">
        <p className="text-body">This screen will land in a future lane.</p>
      </div>
    </div>
  );
}

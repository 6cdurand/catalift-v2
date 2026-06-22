import { Users } from "lucide-react";

import { EmptyState } from "@/components/shell/empty-state";

export default function ClientsPage() {
  return (
    <EmptyState
      icon={Users}
      title="Clients"
      description="Your roster and client groups will appear here."
    />
  );
}

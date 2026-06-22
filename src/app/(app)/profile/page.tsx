import { User } from "lucide-react";

import { EmptyState } from "@/components/shell/empty-state";

export default function ProfilePage() {
  return (
    <EmptyState
      icon={User}
      title="Profile"
      description="Account settings and preferences will live here."
    />
  );
}

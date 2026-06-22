import { MessageSquare } from "lucide-react";

import { EmptyState } from "@/components/shell/empty-state";

export default function MessagesPage() {
  return (
    <EmptyState
      icon={MessageSquare}
      title="Messages"
      description="Conversations with your clients will show up here."
    />
  );
}

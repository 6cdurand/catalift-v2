import { Home } from "lucide-react";

import { EmptyState } from "@/components/shell/empty-state";

export default function HomePage() {
  return (
    <EmptyState
      icon={Home}
      title="Home"
      description="Your coaching dashboard will live here. Nothing to show yet."
    />
  );
}

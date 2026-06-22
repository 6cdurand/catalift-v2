import { Dumbbell } from "lucide-react";

import { EmptyState } from "@/components/shell/empty-state";

export default function WorkoutsPage() {
  return (
    <EmptyState
      icon={Dumbbell}
      title="Workouts"
      description="Build programs and track sessions here once the workout engine ships."
    />
  );
}

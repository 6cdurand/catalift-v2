import { Skeleton } from "@/components/ui/skeleton";

export default function AppLoading() {
  return (
    <div data-testid="app-loading" className="space-y-4">
      <Skeleton className="h-7 w-40" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}

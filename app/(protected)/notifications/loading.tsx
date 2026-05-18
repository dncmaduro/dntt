import { Skeleton } from "@/components/ui/skeleton";

export default function NotificationsLoading() {
  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-border/70 bg-white/70 p-6">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-3 h-9 w-40" />
      </div>

      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-11 w-44 rounded-full" />
        <Skeleton className="h-9 w-44 rounded-full" />
      </div>

      <div className="grid gap-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            className="rounded-[1.75rem] border border-border/70 bg-background p-5"
            key={index}
          >
            <Skeleton className="h-5 w-3/5" />
            <Skeleton className="mt-3 h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-4/5" />
            <Skeleton className="mt-4 h-3 w-32" />
          </div>
        ))}
      </div>
    </div>
  );
}

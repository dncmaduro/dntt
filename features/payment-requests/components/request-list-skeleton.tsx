import { Skeleton } from "@/components/ui/skeleton";

export function RequestListSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Đang tải danh sách đề nghị">
      <div className="page-loading-bar" aria-hidden="true" />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-64 max-w-full" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <Skeleton className="h-11 w-36 rounded-2xl" />
      </div>

      <div className="grid gap-3 rounded-[2rem] border border-border/70 bg-white/70 p-5 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-11 rounded-2xl" />
        ))}
      </div>

      <div className="overflow-hidden rounded-[2rem] border border-border/70 bg-white/70 p-5">
        <Skeleton className="h-10 w-full rounded-xl" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

import { Skeleton } from "@/components/ui/skeleton";

export function RequestDetailSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Đang tải chi tiết đề nghị">
      <div className="page-loading-bar" aria-hidden="true" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-3">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-8 w-72 max-w-full" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <Skeleton className="h-11 w-36 rounded-2xl" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[2rem] border border-border/70 bg-white/70 p-6">
          <Skeleton className="mb-6 h-7 w-48" />
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-24 rounded-3xl" />
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[2rem] border border-border/70 bg-white/70 p-6">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="mt-5 h-24 rounded-2xl" />
            <Skeleton className="mt-4 h-11 rounded-2xl" />
          </div>
          <div className="rounded-[2rem] border border-border/70 bg-white/70 p-6">
            <Skeleton className="h-7 w-36" />
            <div className="mt-5 space-y-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-20 rounded-3xl" />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-36 rounded-[2rem]" />
      </div>
    </div>
  );
}

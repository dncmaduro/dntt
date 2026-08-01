import { Skeleton } from "@/components/ui/skeleton";

export function RequestFormSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Đang tải biểu mẫu đề nghị">
      <div className="page-loading-bar" aria-hidden="true" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-3">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-72 max-w-full" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <Skeleton className="h-11 w-40 rounded-2xl" />
      </div>

      <div className="rounded-[2rem] border border-border/70 bg-white/70 p-6">
        <Skeleton className="h-7 w-44" />
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className={index === 4 ? "md:col-span-2" : ""}>
              <Skeleton className="mb-2 h-4 w-24" />
              <Skeleton className="h-11 w-full rounded-2xl" />
            </div>
          ))}
        </div>
        <Skeleton className="mt-6 h-32 w-full rounded-2xl" />
        <Skeleton className="mt-6 h-11 w-40 rounded-2xl" />
      </div>
    </div>
  );
}

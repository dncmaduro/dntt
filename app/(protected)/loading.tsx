import { Skeleton } from "@/components/ui/skeleton";

export default function ProtectedLoading() {
  return (
    <>
      <div className="page-loading-bar" aria-hidden="true" />
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-36 rounded-3xl" />
          ))}
        </div>
        <Skeleton className="h-[28rem] rounded-3xl" />
      </div>
    </>
  );
}

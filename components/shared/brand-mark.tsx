import { cn } from "@/lib/utils";

export function BrandMark({
  className,
  compact = false,
  inverted = false,
}: {
  className?: string;
  compact?: boolean;
  inverted?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="relative flex size-11 items-center justify-center overflow-hidden rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.3),transparent_60%)]" />
        <span className="relative text-sm font-semibold tracking-[0.24em]">
          D
        </span>
      </div>

      {compact ? null : (
        <div className="space-y-1">
          <p
            className={cn(
              "text-xs font-semibold uppercase leading-none tracking-[0.24em]",
              inverted ? "text-white/60" : "text-primary",
            )}
          >
            Nội bộ
          </p>
          <h1
            className={cn(
              "text-base font-semibold leading-[1.2]",
              inverted ? "text-white" : "text-foreground",
            )}
          >
            Đề nghị thanh toán
          </h1>
        </div>
      )}
    </div>
  );
}

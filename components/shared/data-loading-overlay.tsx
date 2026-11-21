"use client";

import { LoaderCircle } from "lucide-react";

import { useDataNavigation } from "@/components/shared/data-navigation";
import { cn } from "@/lib/utils";

export function DataLoadingOverlay({
  isLoading,
  label = "Đang tải dữ liệu",
  className,
}: {
  isLoading: boolean;
  label?: string;
  className?: string;
}) {
  if (!isLoading) {
    return null;
  }

  return (
    <div
      aria-live="polite"
      aria-label={label}
      className={cn(
        "absolute inset-0 z-20 flex items-center justify-center bg-card/80",
        className,
      )}
      role="status"
    >
      <div className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-muted-foreground shadow-sm">
        <LoaderCircle className="size-4 animate-spin text-primary" />
        <span>{label}</span>
      </div>
    </div>
  );
}

export function DataLoadingRegion({
  children,
  isLoading,
  label,
  className,
}: {
  children: React.ReactNode;
  isLoading: boolean;
  label?: string;
  className?: string;
}) {
  return (
    <div aria-busy={isLoading} className={cn("relative", className)}>
      {children}
      <DataLoadingOverlay isLoading={isLoading} label={label} />
    </div>
  );
}

export function DataNavigationRegion({
  children,
  label = "Đang tải dữ liệu",
  className,
}: {
  children: React.ReactNode;
  label?: string;
  className?: string;
}) {
  const { isPending } = useDataNavigation();

  return (
    <DataLoadingRegion className={className} isLoading={isPending} label={label}>
      {children}
    </DataLoadingRegion>
  );
}

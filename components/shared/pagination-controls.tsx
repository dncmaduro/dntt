"use client";

import { useTransition } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { useDataNavigation } from "@/components/shared/data-navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PaginationControls({
  page,
  pageSize,
  totalItems,
  totalPages,
  className,
}: {
  className?: string;
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const { isPending: isDataPending, start: startDataNavigation } =
    useDataNavigation();

  if (totalPages <= 1) {
    return null;
  }

  const isLoading = isPending || isDataPending;
  const firstItem = (page - 1) * pageSize + 1;
  const lastItem = Math.min(page * pageSize, totalItems);

  const goToPage = (nextPage: number) => {
    if (nextPage < 1 || nextPage > totalPages || isLoading) {
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(nextPage));
    startDataNavigation();
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  return (
    <nav
      aria-label="Phân trang"
      className={cn(
        "flex flex-col gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <p className="text-muted-foreground">
        Hiển thị {firstItem}–{lastItem} trong {totalItems} kết quả
      </p>
      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <span className="text-muted-foreground">
          Trang {page}/{totalPages}
        </span>
        <div className="flex items-center gap-2">
          <Button
            aria-label="Trang trước"
            disabled={page <= 1 || isLoading}
            onClick={() => goToPage(page - 1)}
            size="sm"
            type="button"
            variant="outline"
          >
            <ChevronLeft className="size-4" />
            Trước
          </Button>
          <Button
            aria-label="Trang sau"
            disabled={page >= totalPages || isLoading}
            onClick={() => goToPage(page + 1)}
            size="sm"
            type="button"
            variant="outline"
          >
            Sau
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </nav>
  );
}

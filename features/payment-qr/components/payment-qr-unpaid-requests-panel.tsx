"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, LoaderCircle } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { confirmPaymentRequestPaidAction } from "@/features/payment-requests/actions";
import {
  PaymentBillUploadField,
  type PaymentBillDraft,
} from "@/features/payment-requests/components/payment-bill-upload-field";
import { PaymentRequestList } from "@/features/payment-qr/components/payment-request-list";
import { PaymentSelectionSummary } from "@/features/payment-qr/components/payment-selection-summary";
import type { PaymentQrUnpaidRequestList } from "@/features/payment-qr/types";
import { formatCurrency, generatePaymentReference } from "@/lib/utils";

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, index) => ({
  label: `Tháng ${index + 1}`,
  value: String(index + 1),
}));

type TimeFilterOption = {
  label: string;
  value: string;
};

const getTimeFilterValue = (year: number | null, month: number | null) => {
  if (!year) {
    return "all";
  }

  if (!month) {
    return `year:${year}`;
  }

  return `month:${year}-${month}`;
};

const parseTimeFilterValue = (
  value: string,
): { year: string | null; month: string | null } => {
  if (value === "all") {
    return { year: null, month: null };
  }

  if (value.startsWith("year:")) {
    return { year: value.slice(5), month: null };
  }

  if (value.startsWith("month:")) {
    const [year, month] = value.slice(6).split("-");

    return {
      year: year || null,
      month: month || null,
    };
  }

  return { year: null, month: null };
};

export function PaymentQrUnpaidRequestsPanel({
  employeeName,
  onSelectionSummaryChange,
  requests,
  totalAmount,
  totalCount,
}: {
  employeeName?: string | null;
  onSelectionSummaryChange?: (summary: {
    selectedCount: number;
    selectedTotalAmount: number;
  }) => void;
  requests: PaymentQrUnpaidRequestList;
  totalAmount: number;
  totalCount: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sharedBillDraft, setSharedBillDraft] = useState<PaymentBillDraft | null>(null);
  const [sharedBillError, setSharedBillError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isNavigating, startNavigationTransition] = useTransition();
  const sharedBillPreviewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    sharedBillPreviewUrlRef.current = sharedBillDraft?.previewUrl ?? null;
  }, [sharedBillDraft]);

  useEffect(() => {
    return () => {
      if (sharedBillPreviewUrlRef.current) {
        URL.revokeObjectURL(sharedBillPreviewUrlRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const currentIds = new Set(requests.items.map((item) => item.id));
    setSelectedIds((current) => current.filter((id) => currentIds.has(id)));
  }, [requests.items]);

  const selectedItems = useMemo(
    () => requests.items.filter((request) => selectedIds.includes(request.id)),
    [requests.items, selectedIds],
  );
  const selectedTotalAmount = selectedItems.reduce(
    (total, request) => total + (request.amount ?? 0),
    0,
  );

  useEffect(() => {
    onSelectionSummaryChange?.({
      selectedCount: selectedIds.length,
      selectedTotalAmount,
    });
  }, [onSelectionSummaryChange, selectedIds.length, selectedTotalAmount]);

  const allCurrentPageIds = useMemo(
    () => requests.items.map((request) => request.id),
    [requests.items],
  );
  const isAllChecked =
    allCurrentPageIds.length > 0 &&
    allCurrentPageIds.every((requestId) => selectedIds.includes(requestId));
  const timeFilterOptions = useMemo<TimeFilterOption[]>(() => {
    const options: TimeFilterOption[] = [{ label: "Tất cả thời gian", value: "all" }];

    requests.available_years.forEach((year) => {
      options.push({
        label: `Chỉ năm ${year}`,
        value: `year:${year}`,
      });

      MONTH_OPTIONS.forEach((month) => {
        options.push({
          label: `${month.label} / ${year}`,
          value: `month:${year}-${month.value}`,
        });
      });
    });

    return options;
  }, [requests.available_years]);
  const selectedTimeFilter = getTimeFilterValue(requests.year, requests.month);

  const updateSearchParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });

    startNavigationTransition(() => {
      router.replace(params.toString() ? `${pathname}?${params.toString()}` : pathname);
    });
  };

  const handleTimeFilterChange = (value: string) => {
    const parsedValue = parseTimeFilterValue(value);
    updateSearchParams({
      month: parsedValue.month,
      page: null,
      year: parsedValue.year,
    });
  };

  const handlePageChange = (nextPage: number) => {
    updateSearchParams({
      page: String(nextPage),
    });
  };

  const replaceSharedBill = (nextDraft: PaymentBillDraft | null) => {
    if (sharedBillDraft?.previewUrl) {
      URL.revokeObjectURL(sharedBillDraft.previewUrl);
    }

    setSharedBillDraft(nextDraft);
    setSharedBillError(undefined);
  };

  const toggleRequest = (requestId: string) => {
    setSelectedIds((current) =>
      current.includes(requestId)
        ? current.filter((item) => item !== requestId)
        : [...current, requestId],
    );
  };

  const toggleAllCurrentPage = () => {
    setSelectedIds((current) =>
      isAllChecked
        ? current.filter((item) => !allCurrentPageIds.includes(item))
        : Array.from(new Set([...current, ...allCurrentPageIds])),
    );
  };

  const confirmSelectedRequests = async () => {
    if (!selectedItems.length) {
      toast.error("Vui lòng chọn ít nhất một đề nghị");
      return;
    }

    if (!sharedBillDraft) {
      setSharedBillError("Vui lòng tải bill dùng chung trước khi xác nhận");
      toast.error("Bạn chưa tải bill thanh toán dùng chung");
      return;
    }

    setIsSubmitting(true);
    setSharedBillError(undefined);

    const successfulIds: string[] = [];
    const failedTitles: string[] = [];

    for (const request of selectedItems) {
      const formData = new FormData();
      formData.set("requestId", request.id);
      formData.set("payment_reference", generatePaymentReference());
      formData.set("payment_bill", sharedBillDraft.file);

      const result = await confirmPaymentRequestPaidAction(formData);

      if (!result.success) {
        failedTitles.push(request.title);
        continue;
      }

      successfulIds.push(request.id);
    }

    setIsSubmitting(false);

    if (successfulIds.length) {
      setSelectedIds((current) => current.filter((id) => !successfulIds.includes(id)));
      router.refresh();
    }

    if (successfulIds.length === selectedItems.length) {
      replaceSharedBill(null);
      toast.success(
        successfulIds.length === 1
          ? "Đã xác nhận thanh toán 1 đề nghị"
          : `Đã xác nhận thanh toán ${successfulIds.length} đề nghị`,
      );
      return;
    }

    if (successfulIds.length) {
      toast.error(
        `Đã hoàn tất ${successfulIds.length} đề nghị. Chưa thành công: ${failedTitles.join(", ")}.`,
      );
      return;
    }

    toast.error(`Không thể xác nhận thanh toán cho: ${failedTitles.join(", ")}.`);
  };

  return (
    <section className="rounded-[1.75rem] border border-border/70 bg-white/80 p-5 lg:p-6">
      <div className="space-y-1">
        <h3 className="text-xl font-semibold">Đề nghị chờ thanh toán</h3>
        <p className="text-sm text-muted-foreground">
          Tick đề nghị cần chi trả, chuyển khoản theo QR, sau đó xác nhận hàng loạt.
        </p>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-[14rem_minmax(0,1fr)]">
        <Select
          disabled={!timeFilterOptions.length || isNavigating || isSubmitting}
          onValueChange={handleTimeFilterChange}
          value={selectedTimeFilter}
        >
          <SelectTrigger>
            <SelectValue placeholder="Tất cả thời gian" />
          </SelectTrigger>
          <SelectContent>
            {timeFilterOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="rounded-2xl border border-border/70 bg-background/70 px-4 py-2.5 text-sm text-muted-foreground">
          {employeeName ?? "Nhân sự"} • {totalCount} đề nghị chờ thanh toán • Tổng
          hệ thống: {formatCurrency(totalAmount)}
        </div>
      </div>

      <div className="mt-4 rounded-[1.25rem] border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium">Bill dùng chung cho các đề nghị đang chọn</p>
          <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <input
              checked={isAllChecked}
              className="size-4 accent-[var(--color-primary)]"
              disabled={!allCurrentPageIds.length || isSubmitting || isNavigating}
              onChange={toggleAllCurrentPage}
              type="checkbox"
            />
            Chọn tất cả trên trang
          </label>
        </div>
        <div className="mt-3">
          <PaymentBillUploadField
            compact
            disabled={isSubmitting || isNavigating}
            error={sharedBillError}
            helperText="Mỗi lần xác nhận hàng loạt dùng 1 ảnh bill chung."
            onChange={replaceSharedBill}
            onErrorChange={setSharedBillError}
            value={sharedBillDraft}
          />
        </div>
      </div>

      <div className="mt-4 max-h-[58vh] overflow-y-auto pr-1">
        <PaymentRequestList
          isLoading={isNavigating}
          isSubmitting={isSubmitting}
          items={requests.items}
          selectedIds={selectedIds}
          toggleRequest={toggleRequest}
        />
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Trang {requests.page}/{requests.total_pages} • {requests.total_items} đề nghị theo bộ lọc.
        </p>
        <div className="flex items-center gap-2">
          <Button
            disabled={requests.page <= 1 || isNavigating || isSubmitting}
            onClick={() => handlePageChange(requests.page - 1)}
            type="button"
            variant="outline"
          >
            <ChevronLeft className="size-4" />
            Trước
          </Button>
          <Button
            disabled={requests.page >= requests.total_pages || isNavigating || isSubmitting}
            onClick={() => handlePageChange(requests.page + 1)}
            type="button"
            variant="outline"
          >
            Sau
            {isNavigating ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <ChevronRight className="size-4" />
            )}
          </Button>
        </div>
      </div>

      <PaymentSelectionSummary
        disabled={!selectedIds.length || !sharedBillDraft || isNavigating}
        isSubmitting={isSubmitting}
        onConfirm={confirmSelectedRequests}
        selectedCount={selectedIds.length}
        selectedTotalAmount={selectedTotalAmount}
      />
    </section>
  );
}

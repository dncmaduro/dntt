"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { useDataNavigation } from "@/components/shared/data-navigation";
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
import { MAX_PAYMENT_BILLS } from "@/features/payment-requests/schemas";
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
  compact = false,
  employeeName,
  onSelectionSummaryChange,
  requests,
  totalAmount,
  totalCount,
}: {
  compact?: boolean;
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

  const [selectedIdsState, setSelectedIds] = useState<string[]>([]);
  const [sharedBillDrafts, setSharedBillDrafts] = useState<PaymentBillDraft[]>([]);
  const [sharedBillError, setSharedBillError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isNavigating, startNavigationTransition] = useTransition();
  const { isPending: isDataPending, start: startDataNavigation } =
    useDataNavigation();
  const sharedBillPreviewUrlsRef = useRef<string[]>([]);

  useEffect(() => {
    sharedBillPreviewUrlsRef.current = sharedBillDrafts.map((draft) => draft.previewUrl);
  }, [sharedBillDrafts]);

  useEffect(() => {
    return () => {
      sharedBillPreviewUrlsRef.current.forEach((previewUrl) => {
        URL.revokeObjectURL(previewUrl);
      });
    };
  }, []);

  const allCurrentPageIds = useMemo(
    () => requests.items.map((request) => request.id),
    [requests.items],
  );
  const selectedIds = useMemo(() => {
    const currentIds = new Set(allCurrentPageIds);

    return selectedIdsState.filter((id) => currentIds.has(id));
  }, [allCurrentPageIds, selectedIdsState]);

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

    startDataNavigation();
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

  const replaceSharedBills = (nextDrafts: PaymentBillDraft[]) => {
    const nextDraftIds = new Set(nextDrafts.map((draft) => draft.id));

    sharedBillDrafts.forEach((draft) => {
      if (!nextDraftIds.has(draft.id) && draft.previewUrl) {
        URL.revokeObjectURL(draft.previewUrl);
      }
    });

    setSharedBillDrafts(nextDrafts);
    setSharedBillError(undefined);
  };

  const clearSharedBills = () => {
    sharedBillDrafts.forEach((draft) => {
      if (draft.previewUrl) {
        URL.revokeObjectURL(draft.previewUrl);
      }
    });

    setSharedBillDrafts([]);
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

    if (!sharedBillDrafts.length) {
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
      sharedBillDrafts.forEach((bill) => {
        formData.append("payment_bills", bill.file);
      });

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
      clearSharedBills();
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
    <section className="rounded-lg border border-border bg-card p-5 lg:p-6">
      <div className="space-y-1">
        <h3 className="text-xl font-semibold">
          {compact ? "Các đề nghị thanh toán" : "Đề nghị chờ thanh toán"}
        </h3>
        <p className="text-sm text-muted-foreground">
          {compact
            ? "Chọn đề nghị cần chi trả; trạng thái chọn được giữ khi mở chi tiết."
            : "Tick đề nghị cần chi trả, chuyển khoản theo QR, sau đó xác nhận hàng loạt."}
        </p>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-[14rem_minmax(0,1fr)]">
        <Select
          disabled={
            !timeFilterOptions.length ||
            isNavigating ||
            isDataPending ||
            isSubmitting
          }
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

        <div className="rounded-lg border border-border bg-background/70 px-4 py-2.5 text-sm text-muted-foreground">
          {employeeName ?? "Nhân sự"} • {totalCount} đề nghị chờ thanh toán • Tổng
          Tổng: {formatCurrency(totalAmount)}
        </div>
      </div>

      {!compact ? (
        <div className="mt-4 rounded-md border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium">Bill dùng chung cho các đề nghị đang chọn</p>
            <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <input
                checked={isAllChecked}
                className="size-4 accent-[var(--color-primary)]"
                disabled={
                  !allCurrentPageIds.length ||
                  isSubmitting ||
                  isNavigating ||
                  isDataPending
                }
                onChange={toggleAllCurrentPage}
                type="checkbox"
              />
              Chọn tất cả trên trang
            </label>
          </div>
          <div className="mt-3">
            <PaymentBillUploadField
              compact
              disabled={isSubmitting || isNavigating || isDataPending}
              error={sharedBillError}
              helperText={`Tải từ 1 đến tối đa ${MAX_PAYMENT_BILLS} bill dùng chung cho các đề nghị đang chọn.`}
              maxFiles={MAX_PAYMENT_BILLS}
              onChange={replaceSharedBills}
              onErrorChange={setSharedBillError}
              value={sharedBillDrafts}
            />
          </div>
        </div>
      ) : null}

      <div className="mt-4">
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
            disabled={
              requests.page <= 1 ||
              isNavigating ||
              isDataPending ||
              isSubmitting
            }
            onClick={() => handlePageChange(requests.page - 1)}
            type="button"
            variant="outline"
          >
            <ChevronLeft className="size-4" />
            Trước
          </Button>
          <Button
            disabled={
              requests.page >= requests.total_pages ||
              isNavigating ||
              isDataPending ||
              isSubmitting
            }
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

      {compact ? (
        <div className="mt-5 rounded-md border border-primary/20 bg-primary/5 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-semibold">Bill thanh toán</p>
              <p className="text-sm text-muted-foreground">
                Chọn bill dùng chung rồi xác nhận các đề nghị đã tick.
              </p>
            </div>

            <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <input
                checked={isAllChecked}
                className="size-4 accent-[var(--color-primary)]"
                disabled={
                  !allCurrentPageIds.length ||
                  isSubmitting ||
                  isNavigating ||
                  isDataPending
                }
                onChange={toggleAllCurrentPage}
                type="checkbox"
              />
              Chọn tất cả trên trang
            </label>
          </div>

          <div className="mt-3">
            <PaymentBillUploadField
              compact
              disabled={isSubmitting || isNavigating || isDataPending}
              error={sharedBillError}
              helperText={`Tải từ 1 đến tối đa ${MAX_PAYMENT_BILLS} bill dùng chung cho các đề nghị đang chọn.`}
              maxFiles={MAX_PAYMENT_BILLS}
              onChange={replaceSharedBills}
              onErrorChange={setSharedBillError}
              value={sharedBillDrafts}
            />
          </div>

          <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="text-sm">
              <p className="font-semibold">Đã chọn {selectedIds.length} đề nghị</p>
              <p className="text-muted-foreground">
                Số tiền cần chuyển {formatCurrency(selectedTotalAmount)}
              </p>
            </div>

            <Button
              disabled={
                !selectedIds.length ||
                !sharedBillDrafts.length ||
                isNavigating ||
                isDataPending ||
                isSubmitting
              }
              onClick={confirmSelectedRequests}
              type="button"
            >
              {isSubmitting ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <CheckCircle2 className="size-4" />
              )}
              Xác nhận đã thanh toán
            </Button>
          </div>
        </div>
      ) : (
        <PaymentSelectionSummary
          disabled={
            !selectedIds.length ||
            !sharedBillDrafts.length ||
            isNavigating ||
            isDataPending
          }
          isSubmitting={isSubmitting}
          onConfirm={confirmSelectedRequests}
          selectedCount={selectedIds.length}
          selectedTotalAmount={selectedTotalAmount}
        />
      )}
    </section>
  );
}

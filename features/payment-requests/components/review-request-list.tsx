"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { CheckCircle2, CalendarDays, Files, FolderSearch, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { bulkApproveAccountingRequestsAction } from "@/features/payment-requests/actions";
import { StatusBadge } from "@/features/payment-requests/components/status-badge";
import type { PaymentRequestListItem } from "@/features/payment-requests/types";
import type { PaymentRequestStatus, UserRole } from "@/lib/constants";
import { cn, formatDate } from "@/lib/utils";

export function ReviewRequestList({
  currentRole,
  detailHrefBase,
  emptyDescription,
  items,
  showOwner = false,
}: {
  currentRole: UserRole;
  detailHrefBase: string;
  emptyDescription: string;
  items: PaymentRequestListItem[];
  showOwner?: boolean;
}) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const showBulkOptions = currentRole === "accountant";

  const selectedItems = useMemo(
    () => items.filter((item) => selectedIds.includes(item.id)),
    [items, selectedIds],
  );
  const allSelected =
    items.length > 0 && items.every((item) => selectedIds.includes(item.id));
  const canBulkApprove =
    showBulkOptions &&
    selectedItems.length > 0 &&
    selectedItems.every((item) => item.status === "pending_accounting");

  const toggleRequest = (requestId: string) => {
    setSelectedIds((current) =>
      current.includes(requestId)
        ? current.filter((item) => item !== requestId)
        : [...current, requestId],
    );
  };

  const toggleAll = () => {
    setSelectedIds(allSelected ? [] : items.map((item) => item.id));
  };

  const bulkApprove = () => {
    if (!selectedIds.length) {
      toast.error("Vui lòng chọn ít nhất một đề nghị");
      return;
    }

    if (!canBulkApprove) {
      toast.error(
        "Chỉ duyệt hàng loạt khi tất cả đề nghị được chọn đều đang chờ kế toán",
      );
      return;
    }

    startTransition(async () => {
      const result = await bulkApproveAccountingRequestsAction(selectedIds);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(result.message ?? "Đã duyệt các đề nghị được chọn");
      setSelectedIds([]);
      router.refresh();
    });
  };

  if (!items.length) {
    return (
      <EmptyState
        action={null}
        description={emptyDescription}
        icon={FolderSearch}
        title="Chưa có đề nghị phù hợp"
      />
    );
  }

  return (
    <div className="space-y-4">
      {showBulkOptions ? (
        <div className="surface-panel rounded-[1.75rem] p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="text-sm text-muted-foreground">
              {selectedIds.length
                ? `Đã chọn ${selectedIds.length} đề nghị.`
                : "Chọn nhiều đề nghị để thao tác nhanh."}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm text-muted-foreground">
                Duyệt hàng loạt chỉ áp dụng cho các đề nghị đang chờ kế toán.
              </p>
              <Button
                disabled={!canBulkApprove || isPending}
                onClick={bulkApprove}
                type="button"
              >
                {isPending ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="size-4" />
                )}
                Duyệt đã chọn
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="hidden overflow-hidden rounded-[2rem] border border-border/70 bg-white/75 md:block">
        <table className="min-w-full divide-y divide-border/70">
          <thead className="bg-muted/35">
            <tr className="text-left text-sm text-muted-foreground">
              {showBulkOptions ? (
                <th className="px-5 py-4 font-medium">
                  <input
                    checked={allSelected}
                    className="size-4 accent-[var(--color-primary)]"
                    onChange={toggleAll}
                    type="checkbox"
                  />
                </th>
              ) : null}
              <th className="px-5 py-4 font-medium">Tiêu đề</th>
              {showOwner ? <th className="px-5 py-4 font-medium">Người tạo</th> : null}
              <th className="px-5 py-4 font-medium">Ngày thanh toán</th>
              <th className="px-5 py-4 font-medium">Trạng thái</th>
              <th className="px-5 py-4 font-medium">Chứng từ</th>
              <th className="px-5 py-4 font-medium">Tạo lúc</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60 text-sm">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-muted/20">
                {showBulkOptions ? (
                  <td className="px-5 py-4 align-top">
                    <input
                      checked={selectedIds.includes(item.id)}
                      className="size-4 accent-[var(--color-primary)]"
                      onChange={() => toggleRequest(item.id)}
                      type="checkbox"
                    />
                  </td>
                ) : null}
                <td className="px-5 py-4">
                  <Link
                    className="block space-y-1"
                    href={`${detailHrefBase}/${item.id}`}
                  >
                    <p className="font-semibold text-foreground">{item.title}</p>
                    <p className="line-clamp-1 text-muted-foreground">
                      {item.description || "Không có mô tả"}
                    </p>
                    {item.payment_qr_name ? (
                      <p className="text-xs text-muted-foreground">Có QR thanh toán riêng</p>
                    ) : null}
                  </Link>
                </td>
                {showOwner ? (
                  <td className="px-5 py-4 text-muted-foreground">
                    {item.owner?.full_name ?? "Chưa cập nhật"}
                  </td>
                ) : null}
                <td className="px-5 py-4 text-muted-foreground">
                  {formatDate(item.payment_date)}
                </td>
                <td className="px-5 py-4">
                  <StatusBadge status={item.status as PaymentRequestStatus} />
                </td>
                <td className="px-5 py-4 text-muted-foreground">
                  {item.attachment_count} tệp
                </td>
                <td className="px-5 py-4 text-muted-foreground">
                  {formatDate(item.created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-4 md:hidden">
        {items.map((item) => (
          <Card key={item.id} className="rounded-[1.75rem]">
            <CardContent className="space-y-4 p-5">
              <div
                className={cn(
                  "flex items-start gap-3",
                  showBulkOptions ? "justify-between" : "justify-end",
                )}
              >
                {showBulkOptions ? (
                  <label className="flex items-center gap-3">
                    <input
                      checked={selectedIds.includes(item.id)}
                      className="size-4 accent-[var(--color-primary)]"
                      onChange={() => toggleRequest(item.id)}
                      type="checkbox"
                    />
                    <span className="text-sm text-muted-foreground">Chọn</span>
                  </label>
                ) : null}
                <StatusBadge status={item.status as PaymentRequestStatus} />
              </div>

              <div className="min-w-0">
                <Link href={`${detailHrefBase}/${item.id}`}>
                  <p className="line-clamp-2 font-semibold">{item.title}</p>
                </Link>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {item.description || "Không có mô tả"}
                </p>
                {item.payment_qr_name ? (
                  <p className="mt-1 text-xs text-muted-foreground">Có QR thanh toán riêng</p>
                ) : null}
              </div>

              <div className="grid gap-3 rounded-3xl bg-muted/40 p-4 text-sm">
                {showOwner ? (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Người tạo</span>
                    <span className="font-medium">
                      {item.owner?.full_name ?? "Chưa cập nhật"}
                    </span>
                  </div>
                ) : null}
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2 text-muted-foreground">
                    <CalendarDays className="size-4" />
                    Ngày thanh toán
                  </span>
                  <span className="font-medium">{formatDate(item.payment_date)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2 text-muted-foreground">
                    <Files className="size-4" />
                    Chứng từ
                  </span>
                  <span className="font-medium">{item.attachment_count} tệp</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

import Link from "next/link";
import { CalendarDays, Files, FolderSearch } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/features/payment-requests/components/status-badge";
import type { PaymentRequestStatus } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import type { PaymentRequestListItem } from "@/features/payment-requests/types";

export function RequestList({
  items,
  detailHrefBase,
  showOwner = false,
  emptyDescription,
}: {
  items: PaymentRequestListItem[];
  detailHrefBase: string;
  showOwner?: boolean;
  emptyDescription: string;
}) {
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
    <>
      <div className="hidden overflow-hidden rounded-[2rem] border border-border/70 bg-white/75 md:block">
        <table className="min-w-full divide-y divide-border/70">
          <thead className="bg-muted/35">
            <tr className="text-left text-sm text-muted-foreground">
              <th className="px-5 py-4 font-medium">Tiêu đề</th>
              {showOwner ? <th className="px-5 py-4 font-medium">Người đề nghị</th> : null}
              <th className="px-5 py-4 font-medium">Ngày thanh toán</th>
              <th className="px-5 py-4 font-medium">Trạng thái</th>
              <th className="px-5 py-4 font-medium">Chứng từ</th>
              <th className="px-5 py-4 font-medium">Tạo lúc</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60 text-sm">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-muted/20">
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
                    {item.owner?.full_name ?? item.user_id}
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
              <div className="flex items-start justify-between gap-3">
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
                <StatusBadge status={item.status as PaymentRequestStatus} />
              </div>

              <div className="grid gap-3 rounded-3xl bg-muted/40 p-4 text-sm">
                {showOwner ? (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Người đề nghị</span>
                    <span className="font-medium">
                      {item.owner?.full_name ?? item.user_id}
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
    </>
  );
}

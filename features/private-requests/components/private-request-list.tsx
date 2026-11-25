import Link from "next/link";
import { CalendarDays, Files, FolderSearch } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { PrivateRequestListItem } from "@/features/private-requests/types";
import { formatCurrency, formatDate } from "@/lib/utils";

export function PrivateRequestList({
  detailHrefBase,
  emptyDescription,
  items,
  showOwner = true,
}: {
  detailHrefBase: string;
  emptyDescription: string;
  items: PrivateRequestListItem[];
  showOwner?: boolean;
}) {
  if (!items.length) {
    return (
      <EmptyState
        action={null}
        description={emptyDescription}
        icon={FolderSearch}
        title="Chưa có DNTT riêng phù hợp"
      />
    );
  }

  return (
    <>
      <div className="hidden overflow-hidden rounded-lg border border-border bg-card md:block">
        <table className="min-w-full divide-y divide-border/70">
          <thead className="bg-muted/35">
            <tr className="text-left text-sm text-muted-foreground">
              <th className="px-5 py-4 font-medium">Tiêu đề</th>
              {showOwner ? <th className="px-5 py-4 font-medium">Người tạo</th> : null}
              <th className="px-5 py-4 font-medium">Danh mục</th>
              <th className="px-5 py-4 font-medium">Số tiền</th>
              <th className="px-5 py-4 font-medium">Ngày phát sinh</th>
              <th className="px-5 py-4 font-medium">Chứng từ</th>
              <th className="px-5 py-4 font-medium">Tạo lúc</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60 text-sm">
            {items.map((item) => (
              <tr className="hover:bg-muted/20" key={item.id}>
                <td className="px-5 py-4">
                  <Link className="space-y-1" href={`${detailHrefBase}/${item.id}`}>
                    <p className="font-semibold text-foreground">{item.title}</p>
                    <p className="line-clamp-1 text-muted-foreground">
                      {item.description || "—"}
                    </p>
                  </Link>
                </td>
                {showOwner ? (
                  <td className="px-5 py-4 text-muted-foreground">
                    {item.owner?.full_name ?? item.user_id}
                  </td>
                ) : null}
                <td className="px-5 py-4">
                  <p className="font-medium">{item.category?.name ?? "—"}</p>
                  <p className="text-muted-foreground">
                    {item.sub_category?.name ?? "—"}
                  </p>
                </td>
                <td className="px-5 py-4 font-medium">{formatCurrency(item.amount)}</td>
                <td className="px-5 py-4 text-muted-foreground">
                  {formatDate(item.payment_date)}
                </td>
                <td className="px-5 py-4">
                  <Badge variant="outline">{item.attachment_count} tệp</Badge>
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
          <Card className="rounded-lg" key={item.id}>
            <CardContent className="space-y-4 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link href={`${detailHrefBase}/${item.id}`}>
                    <p className="line-clamp-2 font-semibold">{item.title}</p>
                  </Link>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {item.description || "—"}
                  </p>
                </div>
                <Badge variant="outline">Đã tạo</Badge>
              </div>

              <div className="grid gap-3 rounded-lg bg-muted/40 p-4 text-sm">
                {showOwner ? (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Người tạo</span>
                    <span className="text-right font-medium">
                      {item.owner?.full_name ?? item.user_id}
                    </span>
                  </div>
                ) : null}
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Số tiền</span>
                  <span className="font-medium">{formatCurrency(item.amount)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Danh mục</span>
                  <span className="text-right font-medium">
                    {item.category?.name ?? "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2 text-muted-foreground">
                    <CalendarDays className="size-4" />
                    Ngày phát sinh
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

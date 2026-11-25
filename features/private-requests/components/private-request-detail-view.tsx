import Image from "next/image";
import Link from "next/link";
import { ExternalLink, FileImage, FileText } from "lucide-react";

import { PageIntro } from "@/components/shared/page-intro";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PrivateRequestDetail } from "@/features/private-requests/types";
import { formatCurrency, formatDate, formatDateTime, isImageMimeType } from "@/lib/utils";

export function PrivateRequestDetailView({
  backHref,
  request,
}: {
  backHref: string;
  request: PrivateRequestDetail;
}) {
  return (
    <div className="space-y-6">
      <PageIntro
        actions={
          <Link
            className="inline-flex h-10 items-center justify-center rounded-md bg-secondary px-4 text-sm font-medium text-secondary-foreground"
            href={backHref}
          >
            Quay lại danh sách
          </Link>
        }
        actionsBelow
        title={request.title}
        titleClassName="text-xl md:text-2xl"
      />

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Thông tin DNTT riêng</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <InfoItem label="Người tạo">
              <span className="font-medium">
                {request.owner?.full_name ?? request.user_id}
              </span>
            </InfoItem>
            <InfoItem label="Số tiền">
              <span className="font-medium">{formatCurrency(request.amount)}</span>
            </InfoItem>
            <InfoItem label="Ngày phát sinh">
              <span className="font-medium">{formatDate(request.payment_date)}</span>
            </InfoItem>
            <InfoItem label="Tạo lúc">
              <span className="font-medium">{formatDateTime(request.created_at)}</span>
            </InfoItem>
            <InfoItem label="Danh mục">
              <span className="font-medium">{request.category?.name ?? "—"}</span>
            </InfoItem>
            <InfoItem label="Danh mục con">
              <span className="font-medium">{request.sub_category?.name ?? "—"}</span>
            </InfoItem>
            <InfoItem className="md:col-span-2" label="Mô tả">
              <p className="leading-6 text-muted-foreground">
                {request.description || "—"}
              </p>
            </InfoItem>
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Lịch sử</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {request.logs.length ? (
              request.logs.map((log) => (
                <div className="border-l-2 border-primary/30 pl-4" key={log.id}>
                  <p className="font-medium">Đã tạo DNTT riêng</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {log.actor?.full_name ?? log.actor_id} · {formatDateTime(log.created_at)}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Chưa có lịch sử xử lý.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Chứng từ đính kèm</h2>
        {request.attachments.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {request.attachments.map((attachment) => (
              <Card className="overflow-hidden rounded-lg" key={attachment.id}>
                <CardContent className="space-y-4 p-4">
                  {attachment.signed_url && isImageMimeType(attachment.file_type) ? (
                    <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-muted">
                      <Image
                        alt={attachment.file_name}
                        className="object-cover"
                        fill
                        src={attachment.signed_url}
                        unoptimized
                      />
                    </div>
                  ) : (
                    <div className="flex aspect-[4/3] items-center justify-center rounded-lg bg-muted/50 text-muted-foreground">
                      {isImageMimeType(attachment.file_type) ? (
                        <FileImage className="size-10" />
                      ) : (
                        <FileText className="size-10" />
                      )}
                    </div>
                  )}
                  <div className="space-y-2">
                    <p className="truncate text-sm font-medium">{attachment.file_name}</p>
                    {attachment.signed_url ? (
                      <Link
                        className="inline-flex items-center gap-2 text-sm font-medium text-primary"
                        href={attachment.signed_url}
                        target="_blank"
                      >
                        Xem tệp
                        <ExternalLink className="size-4" />
                      </Link>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Chưa có chứng từ.</p>
        )}
      </section>
    </div>
  );
}

function InfoItem({
  children,
  className,
  label,
}: {
  children: React.ReactNode;
  className?: string;
  label: string;
}) {
  return (
    <div className={`min-w-0 rounded-lg bg-muted/35 p-4 ${className ?? ""}`}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="mt-2 min-w-0 text-sm [overflow-wrap:anywhere]">{children}</div>
    </div>
  );
}

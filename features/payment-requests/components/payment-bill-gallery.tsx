import Image from "next/image";
import Link from "next/link";
import { ExternalLink, FileImage, FileText } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import type { PaymentBillWithUrl } from "@/features/payment-requests/types";
import { isImageMimeType } from "@/lib/utils";

export function PaymentBillGallery({
  emptyLabel = "Chưa có bill thanh toán",
  paymentBills,
}: {
  emptyLabel?: string;
  paymentBills: PaymentBillWithUrl[];
}) {
  if (!paymentBills.length) {
    return (
      <div className="rounded-[1.5rem] border border-dashed border-border/80 bg-muted/20 px-4 py-5 text-sm text-muted-foreground">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {paymentBills.map((bill) => (
        <Card key={bill.id} className="overflow-hidden rounded-[1.75rem]">
          <CardContent className="space-y-4 p-4">
            {bill.signed_url && isImageMimeType(bill.file_type) ? (
              <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-muted">
                <Image
                  alt={bill.file_name ?? "Bill thanh toán"}
                  className="object-cover"
                  fill
                  src={bill.signed_url}
                  unoptimized
                />
              </div>
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center rounded-3xl bg-muted/50 text-muted-foreground">
                {isImageMimeType(bill.file_type) ? (
                  <FileImage className="size-10" />
                ) : (
                  <FileText className="size-10" />
                )}
              </div>
            )}

            <div className="space-y-2">
              <p className="line-clamp-2 text-sm font-medium">
                {bill.file_name ?? "Bill thanh toán"}
              </p>
              {bill.signed_url ? (
                <Link
                  className="inline-flex items-center gap-2 text-sm font-medium text-primary"
                  href={bill.signed_url}
                  target="_blank"
                >
                  Mở tệp
                  <ExternalLink className="size-4" />
                </Link>
              ) : (
                <p className="text-sm text-muted-foreground">Không tải được tệp</p>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

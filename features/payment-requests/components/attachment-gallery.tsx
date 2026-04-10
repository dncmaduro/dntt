import Image from "next/image";
import Link from "next/link";
import { ExternalLink, FileImage, FileText } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { isImageMimeType } from "@/lib/utils";
import type { AttachmentWithUrl } from "@/features/payment-requests/types";

export function AttachmentGallery({
  attachments,
}: {
  attachments: AttachmentWithUrl[];
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {attachments.map((attachment) => (
        <Card key={attachment.id} className="overflow-hidden rounded-[1.75rem]">
          <CardContent className="space-y-4 p-4">
            {attachment.signed_url && isImageMimeType(attachment.file_type) ? (
              <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-muted">
                <Image
                  alt={attachment.file_name}
                  className="object-cover"
                  fill
                  src={attachment.signed_url}
                  unoptimized
                />
              </div>
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center rounded-3xl bg-muted/50 text-muted-foreground">
                {isImageMimeType(attachment.file_type) ? (
                  <FileImage className="size-10" />
                ) : (
                  <FileText className="size-10" />
                )}
              </div>
            )}

            <div className="space-y-2">
              <p className="line-clamp-2 text-sm font-medium">{attachment.file_name}</p>
              <p className="text-xs text-muted-foreground">
                {attachment.file_type || "Tệp đính kèm"}
              </p>
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
  );
}

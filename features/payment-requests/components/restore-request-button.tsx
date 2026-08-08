"use client";

import { LoaderCircle, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { restorePaymentRequestAction } from "@/features/payment-requests/actions";

export function RestoreRequestButton({
  requestId,
}: {
  requestId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const result = await restorePaymentRequestAction(requestId);

          if (!result.success) {
            toast.error(result.error);
            return;
          }

          toast.success(result.message ?? "Đã khôi phục đề nghị");
          router.refresh();
        })
      }
      type="button"
    >
      {isPending ? (
        <LoaderCircle className="size-4 animate-spin" />
      ) : (
        <RotateCcw className="size-4" />
      )}
      Khôi phục
    </Button>
  );
}

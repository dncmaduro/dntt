"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, LoaderCircle, RotateCcw, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  reviewPaymentRequestAction,
  undoPaymentRequestReviewAction,
} from "@/features/payment-requests/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ReviewPanel({
  requestId,
  allowAccountingReview,
  allowUndoAccountingReview,
}: {
  requestId: string;
  allowAccountingReview: boolean;
  allowUndoAccountingReview: boolean;
}) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();

  const submitReview = (decision: "approve" | "reject") => {
    startTransition(async () => {
      const result = await reviewPaymentRequestAction({
        requestId,
        decision,
        note,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(result.message ?? "Đã cập nhật trạng thái");
      setNote("");
      router.refresh();
    });
  };

  const undoReview = () => {
    startTransition(async () => {
      const result = await undoPaymentRequestReviewAction({
        requestId,
        note,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(result.message ?? "Đã hoàn tác quyết định");
      setNote("");
      router.refresh();
    });
  };

  if (!allowAccountingReview && !allowUndoAccountingReview) {
    return null;
  }

  return (
    <Card className="rounded-[2rem]">
      <CardHeader>
        <CardTitle className="text-xl">Thao tác xử lý</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {allowAccountingReview || allowUndoAccountingReview ? (
          <div className="space-y-2">
            <Label htmlFor="review-note">Ghi chú xử lý</Label>
            <Textarea
              id="review-note"
              onChange={(event) => setNote(event.target.value)}
              placeholder={
                allowUndoAccountingReview
                  ? "Nhập ghi chú hoàn tác nếu cần"
                  : "Nhập ghi chú duyệt hoặc lý do từ chối"
              }
              value={note}
            />
          </div>
        ) : null}

        <div className="flex flex-col gap-3">
          {allowAccountingReview ? (
            <>
              <Button
                disabled={isPending}
                onClick={() => submitReview("approve")}
                type="button"
              >
                {isPending ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="size-4" />
                )}
                Duyệt đề nghị
              </Button>
              <Button
                disabled={isPending}
                onClick={() => submitReview("reject")}
                type="button"
                variant="destructive"
              >
                <XCircle className="size-4" />
                Từ chối
              </Button>
            </>
          ) : null}

          {allowUndoAccountingReview ? (
            <Button
              disabled={isPending}
              onClick={undoReview}
              type="button"
              variant="outline"
            >
              {isPending ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <RotateCcw className="size-4" />
              )}
              Hoàn tác quyết định
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

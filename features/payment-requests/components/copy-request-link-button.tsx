"use client";

import { Link2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function CopyRequestLinkButton({
  requestId,
  compact = false,
}: {
  requestId: string;
  compact?: boolean;
}) {
  const copyLink = async () => {
    const link = `${window.location.origin}/r/${requestId}`;

    try {
      await navigator.clipboard.writeText(link);
      toast.success("Đã copy link đề nghị");
    } catch {
      toast.error("Không thể copy link đề nghị");
    }
  };

  return (
    <Button
      aria-label="Copy link đề nghị"
      onClick={copyLink}
      size={compact ? "icon" : "default"}
      title="Copy link đề nghị"
      type="button"
      variant="secondary"
    >
      <Link2 className="size-4" />
      {compact ? null : "Copy link"}
    </Button>
  );
}

"use client";

import { Download, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

const getDownloadFileName = (contentDisposition: string | null) => {
  const encodedName = contentDisposition?.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (encodedName) {
    return decodeURIComponent(encodedName);
  }
  return contentDisposition?.match(/filename="?([^";]+)"?/i)?.[1] ?? "DNTT-rieng.xlsx";
};

export function PrivateExpenseExportButton({ href }: { href: string }) {
  const [isExporting, setIsExporting] = useState(false);

  const exportExpenses = async () => {
    if (isExporting) return;
    setIsExporting(true);

    try {
      const response = await fetch(href, { credentials: "include" });
      const contentType = response.headers.get("content-type") ?? "";
      if (!response.ok || !contentType.includes("spreadsheet")) {
        throw new Error("Private expense export failed");
      }

      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = getDownloadFileName(
        response.headers.get("content-disposition"),
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1_000);
    } catch {
      toast.error("Không thể xuất DNTT riêng. Vui lòng thử lại.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      aria-busy={isExporting}
      className="min-w-32"
      disabled={isExporting}
      onClick={exportExpenses}
      type="button"
    >
      {isExporting ? (
        <LoaderCircle className="size-4 animate-spin" />
      ) : (
        <Download className="size-4" />
      )}
      {isExporting ? "Đang xuất..." : "Xuất DNTT riêng"}
    </Button>
  );
}

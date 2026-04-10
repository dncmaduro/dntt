"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ProtectedError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Card className="mx-auto my-12 max-w-2xl">
      <CardHeader>
        <CardTitle>Không thể tải dữ liệu</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm leading-6 text-muted-foreground">
          Hệ thống gặp sự cố khi truy xuất dữ liệu. Hãy thử tải lại màn hình hoặc
          kiểm tra lại quyền truy cập.
        </p>
        <Button onClick={reset} type="button">
          Tải lại
        </Button>
      </CardContent>
    </Card>
  );
}

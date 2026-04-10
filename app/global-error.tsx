"use client";

import { useEffect } from "react";

export default function GlobalError({
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
    <html lang="vi">
      <body className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="surface-panel max-w-xl rounded-3xl p-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-destructive">
            Lỗi hệ thống
          </p>
          <h1 className="mt-4 text-3xl font-semibold">
            Đã xảy ra lỗi ngoài dự kiến
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Vui lòng tải lại trang hoặc thử lại sau ít phút.
          </p>
          <button
            className="mt-6 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
            onClick={reset}
            type="button"
          >
            Thử lại
          </button>
        </div>
      </body>
    </html>
  );
}

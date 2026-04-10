import Link from "next/link";

import { APP_ROUTES } from "@/lib/constants";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="surface-panel max-w-xl rounded-3xl p-8 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.32em] text-primary">
          404
        </p>
        <h1 className="mt-4 text-3xl font-semibold">Không tìm thấy nội dung</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Trang bạn đang tìm có thể đã thay đổi hoặc bạn không có quyền truy cập.
        </p>
        <Link
          href={APP_ROUTES.dashboard}
          className="mt-6 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
        >
          Quay về tổng quan
        </Link>
      </div>
    </div>
  );
}

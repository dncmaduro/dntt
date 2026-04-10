export default function RootLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="surface-panel w-full max-w-md rounded-3xl p-8 text-center">
        <div className="mx-auto mb-4 h-12 w-12 animate-pulse rounded-2xl bg-primary/15" />
        <p className="text-sm font-medium text-muted-foreground">
          Đang tải dữ liệu hệ thống...
        </p>
      </div>
    </div>
  );
}

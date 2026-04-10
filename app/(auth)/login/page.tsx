import { redirect } from "next/navigation";

import { BrandMark } from "@/components/shared/brand-mark";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "@/features/auth/components/login-form";
import { getCurrentProfile } from "@/lib/auth/session";

type LoginPageProps = {
  searchParams: Promise<{
    redirectTo?: string | string[];
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const profile = await getCurrentProfile();

  if (profile) {
    redirect("/");
  }

  const query = await searchParams;
  const redirectTo = Array.isArray(query.redirectTo)
    ? query.redirectTo[0]
    : query.redirectTo;

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-6">
      <div className="grid w-full max-w-6xl gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="surface-panel hidden overflow-hidden rounded-[2rem] p-8 lg:flex lg:flex-col lg:justify-between lg:gap-12">
          <div className="space-y-12">
            <BrandMark />

            <div className="space-y-5">
              <h1 className="max-w-xl text-4xl font-semibold leading-[1.18] tracking-[-0.025em] text-foreground">
                Theo dõi các đề nghị thanh toán trên hệ thống duy nhất.
              </h1>
              <p className="max-w-xl text-[1.05rem] leading-8 text-muted-foreground">
                Nhân viên gửi đề nghị, kế toán duyệt, giám đốc thanh toán, và mọi
                thay đổi đều được lưu vết rõ ràng.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {[
              ["Tạo DNTT", "Gửi ảnh minh chứng và thông tin thanh toán"],
              ["Duyệt từ kế toán", "Kiểm tra tính hợp lệ và xác nhận hồ sơ"],
              ["Hoàn tất", "Thanh toán và lưu vết đầy đủ"],
            ].map(([title, description]) => (
              <div
                key={title}
                className="rounded-3xl border border-border/80 bg-white/70 p-5"
              >
                <p className="text-sm font-semibold leading-6">{title}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>

        <Card className="overflow-hidden rounded-[2rem]">
          <CardHeader className="space-y-3 border-b border-border/70 pb-6">
            <div className="lg:hidden">
              <BrandMark />
            </div>
            <div>
              <CardTitle className="text-2xl">Đăng nhập hệ thống</CardTitle>
              <CardDescription className="mt-2 text-sm leading-6">
                Sử dụng tài khoản đã được cấp để truy cập hệ thống DNTT nội bộ.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-6 sm:p-8">
            <LoginForm redirectTo={redirectTo} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

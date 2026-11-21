import Link from "next/link";

import { BrandMark } from "@/components/shared/brand-mark";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";
import { APP_ROUTES } from "@/lib/constants";

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-6">
      <Card className="w-full max-w-[460px] overflow-hidden rounded-lg">
        <CardHeader className="space-y-3 border-b border-border pb-6">
          <header className="space-y-3">
            <BrandMark />
            <div>
              <h1 className="text-2xl font-semibold">Đặt lại mật khẩu</h1>
              <CardDescription className="mt-2 text-sm leading-6">
                Tạo mật khẩu mới cho tài khoản của bạn.
              </CardDescription>
            </div>
          </header>
        </CardHeader>
        <CardContent className="space-y-5 p-6 sm:p-8">
          <ResetPasswordForm />
          <p className="text-center text-sm text-muted-foreground">
            Không nhận được email?{" "}
            <Link className="font-medium text-primary hover:text-primary/80" href={APP_ROUTES.forgotPassword}>
              Gửi lại liên kết
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}

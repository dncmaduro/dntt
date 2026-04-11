import Link from "next/link";

import { BrandMark } from "@/components/shared/brand-mark";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";
import { APP_ROUTES } from "@/lib/constants";

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-6">
      <Card className="w-full max-w-xl overflow-hidden rounded-[2rem]">
        <CardHeader className="space-y-3 border-b border-border/70 pb-6">
          <BrandMark />
          <div>
            <CardTitle className="text-2xl">Đặt lại mật khẩu</CardTitle>
            <CardDescription className="mt-2 text-sm leading-6">
              Tạo mật khẩu mới cho tài khoản của bạn.
            </CardDescription>
          </div>
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
    </div>
  );
}

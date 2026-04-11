import { redirect } from "next/navigation";

import { BrandMark } from "@/components/shared/brand-mark";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";
import { APP_ROUTES } from "@/lib/constants";
import { getCurrentProfile } from "@/lib/auth/session";

export default async function ForgotPasswordPage() {
  const profile = await getCurrentProfile();

  if (profile) {
    redirect(APP_ROUTES.dashboard);
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-6">
      <Card className="w-full max-w-xl overflow-hidden rounded-[2rem]">
        <CardHeader className="space-y-3 border-b border-border/70 pb-6">
          <BrandMark />
          <div>
            <CardTitle className="text-2xl">Quên mật khẩu</CardTitle>
            <CardDescription className="mt-2 text-sm leading-6">
              Nhập email tài khoản để nhận liên kết đặt lại mật khẩu.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-6 sm:p-8">
          <ForgotPasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}

import { redirect } from "next/navigation";

import { BrandMark } from "@/components/shared/brand-mark";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";
import { APP_ROUTES } from "@/lib/constants";
import { getCurrentProfile } from "@/lib/auth/session";

export default async function ForgotPasswordPage() {
  const profile = await getCurrentProfile();

  if (profile) {
    redirect(APP_ROUTES.dashboard);
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-6">
      <Card className="w-full max-w-[460px] overflow-hidden rounded-lg">
        <CardHeader className="space-y-3 border-b border-border pb-6">
          <header className="space-y-3">
            <BrandMark />
            <div>
              <h1 className="text-2xl font-semibold">Quên mật khẩu</h1>
              <CardDescription className="mt-2 text-sm leading-6">
                Nhập email tài khoản để nhận liên kết đặt lại mật khẩu.
              </CardDescription>
            </div>
          </header>
        </CardHeader>
        <CardContent className="p-6 sm:p-8">
          <ForgotPasswordForm />
        </CardContent>
      </Card>
    </main>
  );
}

import { PageIntro } from "@/components/shared/page-intro";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChangePasswordForm } from "@/features/auth/components/change-password-form";
import { requireAuth } from "@/lib/auth/session";

export default async function ChangePasswordPage() {
  await requireAuth();

  return (
    <div className="space-y-6">
      <PageIntro
        description="Cập nhật mật khẩu tài khoản để tăng cường an toàn truy cập hệ thống."
        eyebrow="Hồ sơ"
        title="Đổi mật khẩu"
      />

      <Card className="max-w-2xl rounded-[2rem]">
        <CardHeader>
          <CardTitle>Thông tin mật khẩu</CardTitle>
          <CardDescription>
            Mật khẩu mới cần có tối thiểu 8 ký tự và khác mật khẩu hiện tại.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}

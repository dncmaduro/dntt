import Image from "next/image";
import Link from "next/link";

import { PageIntro } from "@/components/shared/page-intro";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ProfileForm } from "@/features/profile/components/profile-form";
import { getProfileQrPreviewUrl } from "@/features/profile/queries";
import { APP_ROUTES, ROLE_LABELS } from "@/lib/constants";
import { requireAuth } from "@/lib/auth/session";

export default async function ProfilePage() {
  const profile = await requireAuth();
  const qrPreviewUrl = await getProfileQrPreviewUrl(profile.qr_payment_url);

  return (
    <div className="space-y-6">
      <PageIntro
        description="Cập nhật thông tin cá nhân và ảnh QR thanh toán để bộ phận kế toán xử lý nhanh chóng, chính xác."
        eyebrow="Hồ sơ"
        title="Hồ sơ cá nhân"
      />

      <div className="grid gap-6 xl:grid-cols-[0.78fr_1.22fr]">
        <Card className="rounded-[2rem]">
          <CardContent className="space-y-6 p-6">
            <div>
              <Badge>Hồ sơ đang sử dụng</Badge>
              <p className="mt-4 text-sm text-muted-foreground">Họ và tên</p>
              <p className="mt-2 text-2xl font-semibold">
                {profile.full_name ?? "Chưa cập nhật"}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[1.5rem] border border-border/70 bg-white/65 p-4">
                <p className="text-sm text-muted-foreground">Vai trò</p>
                <p className="mt-2 text-base font-semibold">
                  {ROLE_LABELS[profile.role]}
                </p>
              </div>

              <div className="rounded-[1.5rem] border border-border/70 bg-white/65 p-4">
                <p className="text-sm text-muted-foreground">Trạng thái ảnh QR</p>
                <p className="mt-2 text-base font-semibold">
                  {profile.qr_payment_url ? "Đã cập nhật" : "Chưa cập nhật"}
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {profile.qr_payment_url
                    ? "Ảnh QR đang được lưu trong hệ thống nội bộ."
                    : "Hãy tải ảnh QR để kế toán thuận tiện đối soát."}
                </p>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-border/70 bg-white/70 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Ảnh QR thanh toán</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Hiển thị ảnh QR hiện tại để kiểm tra nhanh trước khi thay thế.
                  </p>
                </div>
                <Badge variant={profile.qr_payment_url ? "outline" : "secondary"}>
                  {profile.qr_payment_url ? "Đang dùng" : "Trống"}
                </Badge>
              </div>

              <div className="mt-4 flex min-h-72 items-center justify-center rounded-[1.5rem] border border-dashed border-border/80 bg-muted/20 p-6">
                {qrPreviewUrl ? (
                  <div className="relative aspect-square w-full max-w-64 overflow-hidden rounded-[1.25rem] border border-border/70 bg-white shadow-sm">
                    <Image
                      alt="QR thanh toán hiện tại"
                      className="object-contain p-4"
                      fill
                      src={qrPreviewUrl}
                      unoptimized
                    />
                  </div>
                ) : (
                  <p className="max-w-xs text-center text-sm leading-6 text-muted-foreground">
                    Chưa cập nhật ảnh QR
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="md:hidden">
            <Card className="rounded-[2rem]">
              <CardContent className="p-6">
                <p className="text-sm leading-6 text-muted-foreground">
                  Để thao tác thuận tiện hơn trên mobile, cập nhật hồ sơ được tách
                  sang màn hình riêng.
                </p>
                <Button asChild className="mt-4 w-full" type="button">
                  <Link href={APP_ROUTES.profileMobileUpdate}>Mở trang cập nhật hồ sơ</Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="hidden md:block">
            <ProfileForm
              currentQrImageUrl={qrPreviewUrl}
              defaultValues={{
                full_name: profile.full_name ?? "",
              }}
              hasCurrentQr={Boolean(profile.qr_payment_url)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { PageIntro } from "@/components/shared/page-intro";
import { ProfileForm } from "@/features/profile/components/profile-form";
import { getProfileQrPreviewUrl } from "@/features/profile/queries";
import { APP_ROUTES } from "@/lib/constants";
import { requireAuth } from "@/lib/auth/session";

const isMobileUserAgent = (value: string) =>
  /android|iphone|ipad|ipod|mobile/i.test(value);

export default async function MobileProfileUpdatePage() {
  const profile = await requireAuth();
  const userAgent = (await headers()).get("user-agent") ?? "";

  if (!isMobileUserAgent(userAgent)) {
    redirect(APP_ROUTES.profile);
  }

  const qrPreviewUrl = await getProfileQrPreviewUrl(profile.qr_payment_url);

  return (
    <div className="space-y-6 md:hidden">
      <PageIntro
        description="Cập nhật họ tên và ảnh QR trên màn hình riêng cho mobile."
        eyebrow="Hồ sơ"
        title="Cập nhật hồ sơ"
      />

      <ProfileForm
        currentQrImageUrl={qrPreviewUrl}
        defaultValues={{
          full_name: profile.full_name ?? "",
        }}
        hasCurrentQr={Boolean(profile.qr_payment_url)}
      />
    </div>
  );
}

import { PageIntro } from "@/components/shared/page-intro";
import { NotificationList } from "@/features/notifications/components/notification-list";
import { getNotifications } from "@/features/notifications/queries";
import { APP_ROUTES } from "@/lib/constants";
import { requireAuth } from "@/lib/auth/session";

export default async function NotificationsPage() {
  const profile = await requireAuth();
  const notifications = await getNotifications(profile.id);
  const detailHrefBase =
    profile.role === "employee" ? APP_ROUTES.myRequests : APP_ROUTES.requests;

  return (
    <div className="space-y-6">
      <PageIntro
        description="Các cập nhật mới nhất về đề nghị của bạn hoặc các hồ sơ đang thuộc phạm vi xử lý."
        eyebrow="Thông báo"
        title="Thông báo"
      />

      <NotificationList detailHrefBase={detailHrefBase} items={notifications} />
    </div>
  );
}

import { PageIntro } from "@/components/shared/page-intro";
import { NotificationList } from "@/features/notifications/components/notification-list";

export default function NotificationsPage() {
  return (
    <div className="space-y-6">
      <PageIntro eyebrow="Thông báo" title="Thông báo" />

      <NotificationList />
    </div>
  );
}

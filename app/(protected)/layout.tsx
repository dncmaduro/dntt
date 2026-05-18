import { AppShell } from "@/components/shared/app-shell";
import { getNotifications, getUnreadNotificationCount } from "@/features/notifications/queries";
import { requireAuth } from "@/lib/auth/session";
import packageJson from "../../package.json";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireAuth();
  const [notificationsResult, unreadCountResult] = await Promise.allSettled([
    getNotifications(profile.id),
    getUnreadNotificationCount(profile.id),
  ]);
  const appVersion =
    process.env.NEXT_PUBLIC_APP_VERSION ??
    process.env.APP_VERSION ??
    packageJson.version;
  const initialNotifications =
    notificationsResult.status === "fulfilled" ? notificationsResult.value : [];
  const initialUnreadCount =
    unreadCountResult.status === "fulfilled"
      ? unreadCountResult.value
      : initialNotifications.filter((item) => !item.is_read).length;
  const initialNotificationError =
    notificationsResult.status === "rejected" ? "Không thể tải thông báo" : null;

  return (
    <AppShell
      appVersion={appVersion}
      initialNotificationError={initialNotificationError}
      initialNotifications={initialNotifications}
      initialUnreadCount={initialUnreadCount}
      profile={profile}
    >
      {children}
    </AppShell>
  );
}

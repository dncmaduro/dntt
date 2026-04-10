import { AppShell } from "@/components/shared/app-shell";
import { requireAuth } from "@/lib/auth/session";
import { getUnreadNotificationCount } from "@/features/notifications/queries";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireAuth();
  const unreadCount = await getUnreadNotificationCount(profile.id);

  return (
    <AppShell profile={profile} unreadCount={unreadCount}>
      {children}
    </AppShell>
  );
}

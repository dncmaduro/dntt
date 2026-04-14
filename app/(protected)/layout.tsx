import { AppShell } from "@/components/shared/app-shell";
import { requireAuth } from "@/lib/auth/session";
import { getUnreadNotificationCount } from "@/features/notifications/queries";
import packageJson from "../../package.json";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireAuth();
  const unreadCount = await getUnreadNotificationCount(profile.id);
  const appVersion =
    process.env.NEXT_PUBLIC_APP_VERSION ??
    process.env.APP_VERSION ??
    packageJson.version;

  return (
    <AppShell appVersion={appVersion} profile={profile} unreadCount={unreadCount}>
      {children}
    </AppShell>
  );
}

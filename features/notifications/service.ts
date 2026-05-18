import type {
  RealtimeChannel,
  RealtimePostgresInsertPayload,
  RealtimePostgresUpdatePayload,
  SupabaseClient,
} from "@supabase/supabase-js";

import { MAX_NOTIFICATIONS } from "@/features/notifications/constants";
import type { Notification } from "@/features/notifications/types";
import type { Database } from "@/types/database";

type NotificationClient = SupabaseClient<Database>;

type NotificationQueryOptions = {
  userId: string;
  limit?: number;
  unreadOnly?: boolean;
};

const buildReadPayload = (): Database["public"]["Tables"]["notifications"]["Update"] => ({
  is_read: true,
  read_at: new Date().toISOString(),
});

export const fetchNotifications = async (
  client: NotificationClient,
  { userId, limit = MAX_NOTIFICATIONS, unreadOnly = false }: NotificationQueryOptions,
): Promise<Notification[]> => {
  let query = client.from("notifications").select("*").eq("user_id", userId);

  if (unreadOnly) {
    query = query.eq("is_read", false);
  }

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

export const fetchUnreadNotificationCount = async (
  client: NotificationClient,
  userId: string,
) => {
  const { count, error } = await client
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
};

export const fetchUnreadCount = fetchUnreadNotificationCount;

export const markNotificationAsRead = async (
  client: NotificationClient,
  {
    notificationId,
    userId,
  }: {
    notificationId: string;
    userId: string;
  },
): Promise<Notification> => {
  const { data, error } = await client
    .from("notifications")
    .update(buildReadPayload())
    .eq("id", notificationId)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

export const markAllNotificationsAsRead = async (
  client: NotificationClient,
  userId: string,
) => {
  const { error } = await client
    .from("notifications")
    .update(buildReadPayload())
    .eq("user_id", userId)
    .eq("is_read", false);

  if (error) {
    throw new Error(error.message);
  }
};

export const subscribeNotifications = ({
  client,
  onInsert,
  onStatus,
  onUpdate,
  userId,
}: {
  client: NotificationClient;
  onInsert: (payload: RealtimePostgresInsertPayload<Notification>) => void;
  onStatus?: (status: string, error?: Error) => void;
  onUpdate: (payload: RealtimePostgresUpdatePayload<Notification>) => void;
  userId: string;
}): RealtimeChannel =>
  client
    .channel(`notifications:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      },
      onInsert,
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      },
      onUpdate,
    )
    .subscribe((status, error) => {
      onStatus?.(status, error);
    });

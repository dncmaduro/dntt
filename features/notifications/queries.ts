import { fetchNotifications, fetchUnreadNotificationCount } from "./service";

import { createClient } from "@/lib/supabase/server";

export const getUnreadNotificationCount = async (userId: string) => {
  const supabase = await createClient();

  return fetchUnreadNotificationCount(supabase, userId);
};

export const getNotifications = async (
  userId: string,
  options?: {
    limit?: number;
    unreadOnly?: boolean;
  },
) => {
  const supabase = await createClient();

  return fetchNotifications(supabase, {
    userId,
    limit: options?.limit,
    unreadOnly: options?.unreadOnly,
  });
};

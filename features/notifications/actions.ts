"use server";

import { revalidatePath } from "next/cache";

import type { ActionResult } from "@/features/payment-requests/types";
import { APP_ROUTES } from "@/lib/constants";
import { requireAuth } from "@/lib/auth/session";
import { createActionClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export const markNotificationAsReadAction = async (
  notificationId: string,
): Promise<ActionResult> => {
  try {
    const profile = await requireAuth();
    const supabase = await createActionClient();
    const payload: Database["public"]["Tables"]["notifications"]["Update"] = {
      is_read: true,
      read_at: new Date().toISOString(),
    };
    const { error } = await supabase
      .from("notifications")
      .update(payload as never)
      .eq("id", notificationId)
      .eq("user_id", profile.id);

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath(APP_ROUTES.notifications);
    revalidatePath(APP_ROUTES.dashboard);

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Không thể cập nhật thông báo",
    };
  }
};

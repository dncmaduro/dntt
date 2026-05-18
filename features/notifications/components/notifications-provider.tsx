"use client";

import {
  createContext,
  useContext,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";
import type {
  RealtimePostgresInsertPayload,
  RealtimePostgresUpdatePayload,
} from "@supabase/supabase-js";
import { toast } from "sonner";

import { MAX_NOTIFICATIONS } from "@/features/notifications/constants";
import {
  fetchNotifications,
  fetchUnreadNotificationCount,
  subscribeNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "@/features/notifications/service";
import type { Notification } from "@/features/notifications/types";
import {
  getNotificationPaymentRequestSummary,
  getNotificationTypeLabel,
  upsertNotification,
} from "@/features/notifications/utils";
import type { UserRole } from "@/lib/constants";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

type NotificationsContextValue = {
  error: string | null;
  isMarkingAllRead: boolean;
  markingNotificationId: string | null;
  notifications: Notification[];
  unreadCount: number;
  userRole: UserRole;
  markAllAsRead: () => Promise<boolean>;
  markAsRead: (notificationId: string) => Promise<boolean>;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

const DEFAULT_ERROR_MESSAGE = "Không thể tải thông báo";
const isDevelopment = process.env.NODE_ENV === "development";
const NOTIFICATION_SOUND_SRC = "/sounds/dntt-sound.mp3";
const NOTIFICATION_SOUND_VOLUME = 0.7;

const logRealtime = (message: string, payload?: unknown) => {
  if (!isDevelopment) {
    return;
  }

  if (payload === undefined) {
    console.log(`[notifications realtime] ${message}`);
    return;
  }

  console.log(`[notifications realtime] ${message}`, payload);
};

const resolveToastDescription = (notification: Notification) => {
  const summary = getNotificationPaymentRequestSummary(notification);

  if (summary.requestTitle && summary.creator) {
    return `${summary.requestTitle} • ${summary.creator}`;
  }

  if (summary.requestTitle) {
    return summary.requestTitle;
  }

  if (summary.creator) {
    return `Người tạo: ${summary.creator}`;
  }

  return notification.body;
};

const mergeNotifications = (
  currentNotifications: Notification[],
  incomingNotifications: Notification[],
) =>
  incomingNotifications.reduce(
    (items, notification) =>
      upsertNotification(items, notification, MAX_NOTIFICATIONS),
    currentNotifications,
  );

const resolveInsertUnreadCount = ({
  currentNotifications,
  currentUnreadCount,
  nextNotification,
}: {
  currentNotifications: Notification[];
  currentUnreadCount: number;
  nextNotification: Notification;
}) => {
  const existingNotification = currentNotifications.find(
    (item) => item.id === nextNotification.id,
  );

  if (!existingNotification) {
    return nextNotification.is_read ? currentUnreadCount : currentUnreadCount + 1;
  }

  if (existingNotification.is_read === nextNotification.is_read) {
    return currentUnreadCount;
  }

  return nextNotification.is_read
    ? Math.max(0, currentUnreadCount - 1)
    : currentUnreadCount + 1;
};

const resolveUpdateUnreadCount = ({
  currentNotifications,
  currentUnreadCount,
  payload,
}: {
  currentNotifications: Notification[];
  currentUnreadCount: number;
  payload: RealtimePostgresUpdatePayload<Notification>;
}) => {
  const existingNotification = currentNotifications.find(
    (item) => item.id === payload.new.id,
  );

  if (!existingNotification) {
    return payload.new.is_read ? currentUnreadCount : currentUnreadCount + 1;
  }

  if (existingNotification?.is_read === payload.new.is_read) {
    return currentUnreadCount;
  }

  const previousIsRead =
    existingNotification?.is_read ?? payload.old.is_read;

  if (typeof previousIsRead !== "boolean") {
    return currentUnreadCount;
  }

  if (previousIsRead === payload.new.is_read) {
    return currentUnreadCount;
  }

  return payload.new.is_read
    ? Math.max(0, currentUnreadCount - 1)
    : currentUnreadCount + 1;
};

export function NotificationsProvider({
  children,
  initialError = null,
  initialNotifications,
  initialUnreadCount,
  userId,
  userRole,
}: {
  children: React.ReactNode;
  initialError?: string | null;
  initialNotifications: Notification[];
  initialUnreadCount: number;
  userId: string;
  userRole: UserRole;
}) {
  const [supabase] = useState(createBrowserSupabaseClient);
  const [notifications, setNotifications] = useState(initialNotifications);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [error, setError] = useState<string | null>(initialError);
  const [markingNotificationId, setMarkingNotificationId] = useState<string | null>(
    null,
  );
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);
  const notificationsRef = useRef(initialNotifications);
  const unreadCountRef = useRef(initialUnreadCount);
  const previousUserIdRef = useRef(userId);
  const syncRequestIdRef = useRef(0);
  const notificationAudioRef = useRef<HTMLAudioElement | null>(null);
  const hasCompletedBootstrapRef = useRef(false);

  useEffect(() => {
    notificationsRef.current = notifications;
  }, [notifications]);

  useEffect(() => {
    unreadCountRef.current = unreadCount;
  }, [unreadCount]);

  const commitState = (
    nextNotifications: Notification[],
    nextUnreadCount: number,
  ) => {
    notificationsRef.current = nextNotifications;
    unreadCountRef.current = nextUnreadCount;
    setNotifications(nextNotifications);
    setUnreadCount(nextUnreadCount);
  };

  const playNotificationSound = useEffectEvent(async () => {
    if (typeof window === "undefined") {
      return;
    }

    const audio = notificationAudioRef.current;

    if (!audio) {
      return;
    }

    try {
      audio.currentTime = 0;
      await audio.play();
    } catch (soundError) {
      if (isDevelopment) {
        console.warn("[notifications realtime] sound failed", soundError);
      }
    }
  });

  const showNotificationToast = useEffectEvent((notification: Notification) => {
    toast.info(getNotificationTypeLabel(notification.type), {
      description: resolveToastDescription(notification),
      duration: 5000,
    });
  });

  const announceNotifications = useEffectEvent((items: Notification[]) => {
    if (!items.length) {
      return;
    }

    items.forEach((notification) => {
      showNotificationToast(notification);
    });

    void playNotificationSound();
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const audio = new Audio(NOTIFICATION_SOUND_SRC);
    audio.preload = "auto";
    audio.volume = NOTIFICATION_SOUND_VOLUME;
    notificationAudioRef.current = audio;
    audio.load();

    return () => {
      if (notificationAudioRef.current) {
        notificationAudioRef.current.pause();
        notificationAudioRef.current.src = "";
        notificationAudioRef.current.load();
        notificationAudioRef.current = null;
      }
    };
  }, []);

  const syncNotifications = useEffectEvent(async (reason: "bootstrap" | "repair") => {
    if (!userId) {
      return;
    }

    const requestId = ++syncRequestIdRef.current;
    const activeUserId = userId;

    try {
      const [latestNotifications, latestUnreadCount] = await Promise.all([
        fetchNotifications(supabase, {
          userId: activeUserId,
          limit: MAX_NOTIFICATIONS,
        }),
        fetchUnreadNotificationCount(supabase, activeUserId),
      ]);

      if (syncRequestIdRef.current !== requestId || activeUserId !== userId) {
        return;
      }

      const nextNotifications =
        reason === "bootstrap"
          ? mergeNotifications(notificationsRef.current, latestNotifications)
          : latestNotifications;
      const nextNotificationIds = new Set(
        notificationsRef.current.map((notification) => notification.id),
      );
      const unseenNotifications = latestNotifications.filter(
        (notification) => !nextNotificationIds.has(notification.id),
      );

      commitState(nextNotifications, latestUnreadCount);
      setError(null);

      if (reason === "repair" && unseenNotifications.length) {
        announceNotifications(unseenNotifications);
      }

      hasCompletedBootstrapRef.current = true;
    } catch (syncError) {
      if (syncRequestIdRef.current !== requestId || activeUserId !== userId) {
        return;
      }

      if (isDevelopment) {
        console.error("[notifications realtime] sync failed", syncError);
      }

      setError((currentError) => currentError ?? DEFAULT_ERROR_MESSAGE);
    }
  });

  const handleInsert = useEffectEvent(
    (payload: RealtimePostgresInsertPayload<Notification>) => {
      const nextNotification = payload.new;

      if (!nextNotification?.id) {
        return;
      }

      logRealtime("INSERT", {
        id: nextNotification.id,
        is_read: nextNotification.is_read,
        user_id: nextNotification.user_id,
      });

      const currentNotifications = notificationsRef.current;
      const isNewNotification = !currentNotifications.some(
        (item) => item.id === nextNotification.id,
      );
      const nextNotifications = upsertNotification(
        currentNotifications,
        nextNotification,
        MAX_NOTIFICATIONS,
      );
      const nextUnreadCount = resolveInsertUnreadCount({
        currentNotifications,
        currentUnreadCount: unreadCountRef.current,
        nextNotification,
      });

      commitState(nextNotifications, nextUnreadCount);
      setError(null);

      if (isNewNotification) {
        showNotificationToast(nextNotification);
        void playNotificationSound();
      }
    },
  );

  const handleUpdate = useEffectEvent(
    (payload: RealtimePostgresUpdatePayload<Notification>) => {
      const nextNotification = payload.new;

      if (!nextNotification?.id) {
        return;
      }

      logRealtime("UPDATE", {
        id: nextNotification.id,
        is_read: nextNotification.is_read,
        user_id: nextNotification.user_id,
      });

      const currentNotifications = notificationsRef.current;
      const isNewNotification = !currentNotifications.some(
        (item) => item.id === nextNotification.id,
      );
      const nextNotifications = upsertNotification(
        currentNotifications,
        nextNotification,
        MAX_NOTIFICATIONS,
      );
      const nextUnreadCount = resolveUpdateUnreadCount({
        currentNotifications,
        currentUnreadCount: unreadCountRef.current,
        payload,
      });

      commitState(nextNotifications, nextUnreadCount);
      setError(null);

      if (isNewNotification && hasCompletedBootstrapRef.current) {
        announceNotifications([nextNotification]);
      }

      if (
        isNewNotification &&
        typeof payload.old.is_read !== "boolean"
      ) {
        void syncNotifications("repair");
      }
    },
  );

  useEffect(() => {
    if (previousUserIdRef.current === userId) {
      return;
    }

    previousUserIdRef.current = userId;
    notificationsRef.current = initialNotifications;
    unreadCountRef.current = initialUnreadCount;
    hasCompletedBootstrapRef.current = false;
    setNotifications(initialNotifications);
    setUnreadCount(initialUnreadCount);
    setError(initialError);
    setMarkingNotificationId(null);
    setIsMarkingAllRead(false);
  }, [initialError, initialNotifications, initialUnreadCount, userId]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    void syncNotifications("bootstrap");
  }, [supabase, userId]);

  useEffect(() => {
    if (typeof window === "undefined" || !userId) {
      return;
    }

    const handleFocusSync = () => {
      void syncNotifications("repair");
    };

    const handleVisibilitySync = () => {
      if (document.visibilityState === "visible") {
        void syncNotifications("repair");
      }
    };

    window.addEventListener("focus", handleFocusSync);
    document.addEventListener("visibilitychange", handleVisibilitySync);

    return () => {
      window.removeEventListener("focus", handleFocusSync);
      document.removeEventListener("visibilitychange", handleVisibilitySync);
    };
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    const channel = subscribeNotifications({
      client: supabase,
      onInsert: handleInsert,
      onStatus: (status, channelError) => {
        if (!isDevelopment) {
          return;
        }

        if (status === "SUBSCRIBED") {
          console.log("[notifications realtime] Notifications realtime subscribed");
          return;
        }

        if (status === "CHANNEL_ERROR") {
          console.error(
            "[notifications realtime] CHANNEL_ERROR",
            channelError ?? "Không có chi tiết lỗi",
          );
          return;
        }

        if (status === "TIMED_OUT") {
          console.warn("[notifications realtime] TIMED_OUT");
          return;
        }

        console.log("[notifications realtime]", status);
      },
      onUpdate: handleUpdate,
      userId,
    });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, userId]);

  const markAsRead = async (notificationId: string) => {
    const targetNotification = notificationsRef.current.find(
      (item) => item.id === notificationId,
    );

    if (!targetNotification || targetNotification.is_read) {
      return true;
    }

    setMarkingNotificationId(notificationId);

    try {
      const optimisticReadAt = new Date().toISOString();
      const optimisticNotification = {
        ...targetNotification,
        is_read: true,
        read_at: optimisticReadAt,
      };
      const optimisticNotifications = upsertNotification(
        notificationsRef.current,
        optimisticNotification,
        MAX_NOTIFICATIONS,
      );
      const optimisticUnreadCount = Math.max(0, unreadCountRef.current - 1);

      commitState(optimisticNotifications, optimisticUnreadCount);

      const updatedNotification = await markNotificationAsRead(supabase, {
        notificationId,
        userId,
      });
      const nextNotifications = upsertNotification(
        notificationsRef.current,
        updatedNotification,
        MAX_NOTIFICATIONS,
      );

      commitState(nextNotifications, unreadCountRef.current);
      setError(null);

      return true;
    } catch {
      const restoredNotifications = upsertNotification(
        notificationsRef.current,
        targetNotification,
        MAX_NOTIFICATIONS,
      );
      const restoredUnreadCount = unreadCountRef.current + 1;

      commitState(restoredNotifications, restoredUnreadCount);

      const message = "Không thể cập nhật thông báo";
      setError(message);
      toast.error(message);

      return false;
    } finally {
      setMarkingNotificationId((currentValue) =>
        currentValue === notificationId ? null : currentValue,
      );
    }
  };

  const markAllAsRead = async () => {
    if (unreadCountRef.current === 0) {
      return true;
    }

    setIsMarkingAllRead(true);

    try {
      await markAllNotificationsAsRead(supabase, userId);
      const readAt = new Date().toISOString();
      const nextNotifications = notificationsRef.current.map((item) =>
        item.is_read ? item : { ...item, is_read: true, read_at: readAt },
      );

      commitState(nextNotifications, 0);
      setError(null);

      return true;
    } catch {
      const message = "Không thể cập nhật thông báo";
      setError(message);
      toast.error(message);

      return false;
    } finally {
      setIsMarkingAllRead(false);
    }
  };

  return (
    <NotificationsContext.Provider
      value={{
        error,
        isMarkingAllRead,
        markingNotificationId,
        notifications,
        unreadCount,
        userRole,
        markAllAsRead,
        markAsRead,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export const useNotifications = () => {
  const context = useContext(NotificationsContext);

  if (!context) {
    throw new Error("useNotifications must be used within NotificationsProvider");
  }

  return context;
};

import { format } from "date-fns";
import { vi } from "date-fns/locale";

import { APP_ROUTES, type UserRole } from "@/lib/constants";

import {
  DEPRECATED_NOTIFICATION_TYPE_LABELS,
  MAX_NOTIFICATIONS,
  NOTIFICATION_TYPE_LABELS,
} from "./constants";
import type { Notification } from "./types";

export const formatNotificationTime = (value: string) => {
  const targetDate = new Date(value);
  const diffInMs = Date.now() - targetDate.getTime();

  if (diffInMs < 60_000) {
    return "Vừa xong";
  }

  if (diffInMs < 3_600_000) {
    return `${Math.max(1, Math.floor(diffInMs / 60_000))} phút trước`;
  }

  if (diffInMs < 86_400_000) {
    return `${Math.max(1, Math.floor(diffInMs / 3_600_000))} giờ trước`;
  }

  return format(targetDate, "dd/MM/yyyy HH:mm", { locale: vi });
};

export const getNotificationTypeLabel = (type: string) =>
  NOTIFICATION_TYPE_LABELS[type] ??
  DEPRECATED_NOTIFICATION_TYPE_LABELS[type] ??
  type;

const extractNotificationField = (body: string | null, labels: string[]) => {
  if (!body) {
    return null;
  }

  for (const label of labels) {
    const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = body.match(
      new RegExp(`${escapedLabel}:\\s*([^\\n•]+)`, "i"),
    );

    if (match?.[1]?.trim()) {
      return match[1].trim();
    }
  }

  return null;
};

export const getNotificationPaymentRequestSummary = (
  notification: Notification,
) => ({
  creator:
    extractNotificationField(notification.body, ["Người tạo", "Người đề nghị"]) ??
    null,
  requestTitle:
    extractNotificationField(notification.body, ["Tiêu đề"]) ??
    (notification.entity_type === "payment_request" ? notification.title : null),
});

const NON_NAVIGABLE_PAYMENT_REQUEST_TYPES = new Set([
  "payment_request_deleted",
]);

export const resolveNotificationHref = (
  notification: Notification,
  userRole: UserRole,
) => {
  if (
    notification.entity_type === "payment_request" &&
    notification.entity_id &&
    !NON_NAVIGABLE_PAYMENT_REQUEST_TYPES.has(notification.type)
  ) {
    return `${userRole === "employee" ? APP_ROUTES.myRequests : APP_ROUTES.requests}/${notification.entity_id}`;
  }

  return null;
};

export const sortNotifications = (items: Notification[]) =>
  [...items].sort(
    (left, right) =>
      new Date(right.created_at).getTime() - new Date(left.created_at).getTime(),
  );

export const upsertNotification = (
  items: Notification[],
  notification: Notification,
  limit = MAX_NOTIFICATIONS,
) =>
  sortNotifications([
    notification,
    ...items.filter((item) => item.id !== notification.id),
  ]).slice(0, limit);

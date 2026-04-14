import type { LucideIcon } from "lucide-react";
import {
  BellRing,
  CircleUserRound,
  FilePlus2,
  Files,
  LayoutDashboard,
  ScanQrCode,
} from "lucide-react";

export const ROLES = ["employee", "accountant", "director"] as const;
export type UserRole = (typeof ROLES)[number];

export const PAYMENT_REQUEST_STATUSES = [
  "pending_accounting",
  "accounting_rejected",
  "pending_director",
  "director_rejected",
  "director_approved",
  "paid",
] as const;
export type PaymentRequestStatus = (typeof PAYMENT_REQUEST_STATUSES)[number];

export const ACTIVE_PAYMENT_REQUEST_STATUSES = [
  "pending_accounting",
  "accounting_rejected",
  "director_approved",
  "paid",
] as const satisfies readonly PaymentRequestStatus[];

export const PAYMENT_REQUEST_LOG_ACTIONS = [
  "created",
  "updated",
  "soft_deleted",
  "accounting_approved",
  "accounting_rejected",
  "director_approved",
  "director_rejected",
  "marked_paid",
] as const;
export type PaymentRequestLogAction =
  (typeof PAYMENT_REQUEST_LOG_ACTIONS)[number];

export const NOTIFICATION_TYPES = [
  "request_created",
  "accounting_approved",
  "accounting_rejected",
  "director_approved",
  "director_rejected",
  "marked_paid",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const REQUEST_SORT_OPTIONS = ["newest", "oldest"] as const;
export type RequestSortOption = (typeof REQUEST_SORT_OPTIONS)[number];

export const DEFAULT_REQUEST_STATUS: PaymentRequestStatus =
  "pending_accounting";
export const STORAGE_BUCKET = "payment-request-files";

export const STATUS_LABELS: Record<PaymentRequestStatus, string> = {
  pending_accounting: "Chờ kế toán",
  accounting_rejected: "Kế toán từ chối",
  pending_director: "Đã duyệt",
  director_rejected: "Kế toán từ chối",
  director_approved: "Đã duyệt",
  paid: "Đã thanh toán",
};

export const REQUEST_STATUS_OPTIONS = ACTIVE_PAYMENT_REQUEST_STATUSES.map((status) => ({
  value: status,
  label: STATUS_LABELS[status],
}));

export const REQUEST_DELETION_FILTER_OPTIONS = [
  { value: "active", label: "Chưa xóa" },
  { value: "deleted", label: "Đã xóa" },
] as const;

export const STATUS_BADGE_VARIANTS: Record<PaymentRequestStatus, string> = {
  pending_accounting:
    "border-amber-200 bg-amber-50 text-amber-700 ring-amber-100",
  accounting_rejected:
    "border-rose-200 bg-rose-50 text-rose-700 ring-rose-100",
  pending_director:
    "border-emerald-200 bg-emerald-50 text-emerald-700 ring-emerald-100",
  director_rejected:
    "border-rose-200 bg-rose-50 text-rose-700 ring-rose-100",
  director_approved:
    "border-emerald-200 bg-emerald-50 text-emerald-700 ring-emerald-100",
  paid: "border-teal-200 bg-teal-50 text-teal-700 ring-teal-100",
};

export const ROLE_LABELS: Record<UserRole, string> = {
  employee: "Nhân viên",
  accountant: "Kế toán",
  director: "Giám đốc",
};

export const LOG_ACTION_LABELS: Record<PaymentRequestLogAction, string> = {
  created: "Tạo đề nghị",
  updated: "Cập nhật đề nghị",
  soft_deleted: "Xóa mềm đề nghị",
  accounting_approved: "Kế toán duyệt",
  accounting_rejected: "Kế toán từ chối",
  director_approved: "Đề nghị đã duyệt",
  director_rejected: "Đề nghị bị từ chối",
  marked_paid: "Đánh dấu đã thanh toán",
};

export const NOTIFICATION_LABELS: Record<NotificationType, string> = {
  request_created: "Đề nghị mới",
  accounting_approved: "Đề nghị đã duyệt",
  accounting_rejected: "Kế toán từ chối",
  director_approved: "Đề nghị đã duyệt",
  director_rejected: "Đề nghị bị từ chối",
  marked_paid: "Đã thanh toán",
};

export const EMPLOYEE_EDITABLE_STATUSES: PaymentRequestStatus[] = [
  "pending_accounting",
  "accounting_rejected",
  "director_rejected",
];

export const DELETABLE_STATUSES = EMPLOYEE_EDITABLE_STATUSES;

export const PAGE_TITLES: Record<string, string> = {
  "/": "Tổng quan",
  "/login": "Đăng nhập",
  "/forgot-password": "Quên mật khẩu",
  "/reset-password": "Đặt lại mật khẩu",
  "/my-requests": "DNTT của tôi",
  "/my-requests/new": "Tạo đề nghị mới",
  "/requests": "Tất cả đề nghị",
  "/payment-qr": "QR thanh toán",
  "/notifications": "Thông báo",
  "/profile": "Cá nhân",
  "/profile/update-mobile": "Cập nhật hồ sơ",
  "/profile/change-password": "Đổi mật khẩu",
};

export const APP_ROUTES = {
  dashboard: "/",
  login: "/login",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",
  authConfirm: "/auth/confirm",
  myRequests: "/my-requests",
  newRequest: "/my-requests/new",
  requests: "/requests",
  paymentQr: "/payment-qr",
  notifications: "/notifications",
  profile: "/profile",
  profileMobileUpdate: "/profile/update-mobile",
  changePassword: "/profile/change-password",
} as const;

export type NavigationItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const EMPLOYEE_NAVIGATION: NavigationItem[] = [
  {
    href: APP_ROUTES.dashboard,
    label: "Tổng quan",
    icon: LayoutDashboard,
  },
  {
    href: APP_ROUTES.myRequests,
    label: "DNTT của tôi",
    icon: Files,
  },
  {
    href: APP_ROUTES.newRequest,
    label: "Tạo mới",
    icon: FilePlus2,
  },
  {
    href: APP_ROUTES.notifications,
    label: "Thông báo",
    icon: BellRing,
  },
  {
    href: APP_ROUTES.profile,
    label: "Cá nhân",
    icon: CircleUserRound,
  },
];

export const ACCOUNTANT_NAVIGATION: NavigationItem[] = [
  {
    href: APP_ROUTES.dashboard,
    label: "Tổng quan",
    icon: LayoutDashboard,
  },
  {
    href: APP_ROUTES.myRequests,
    label: "DNTT của tôi",
    icon: Files,
  },
  {
    href: APP_ROUTES.newRequest,
    label: "Tạo mới",
    icon: FilePlus2,
  },
  {
    href: APP_ROUTES.requests,
    label: "Tất cả DNTT",
    icon: Files,
  },
  {
    href: APP_ROUTES.notifications,
    label: "Thông báo",
    icon: BellRing,
  },
  {
    href: APP_ROUTES.profile,
    label: "Cá nhân",
    icon: CircleUserRound,
  },
];

export const DIRECTOR_NAVIGATION: NavigationItem[] = [
  {
    href: APP_ROUTES.dashboard,
    label: "Tổng quan",
    icon: LayoutDashboard,
  },
  {
    href: APP_ROUTES.requests,
    label: "Tất cả DNTT",
    icon: Files,
  },
  {
    href: APP_ROUTES.paymentQr,
    label: "QR thanh toán",
    icon: ScanQrCode,
  },
  {
    href: APP_ROUTES.notifications,
    label: "Thông báo",
    icon: BellRing,
  },
  {
    href: APP_ROUTES.profile,
    label: "Cá nhân",
    icon: CircleUserRound,
  },
];

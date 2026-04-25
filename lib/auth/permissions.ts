import {
  EMPLOYEE_EDITABLE_STATUSES,
  type PaymentRequestStatus,
  type UserRole,
} from "@/lib/constants";

export const isReviewer = (role: UserRole) =>
  role === "accountant" || role === "director";

export const canViewGlobalRequests = (role: UserRole) => isReviewer(role);

export const canManageOwnRequest = (
  role: UserRole,
  status: PaymentRequestStatus,
) =>
  (role === "employee" || role === "accountant") &&
  EMPLOYEE_EDITABLE_STATUSES.includes(status);

export const canSoftDeleteOwnRequest = (
  role: UserRole,
  status: PaymentRequestStatus,
) =>
  (role === "employee" || role === "accountant") &&
  status === "pending_accounting";

export const canDeleteRequest = ({
  isOwner,
  role,
  status,
}: {
  isOwner: boolean;
  role: UserRole;
  status: PaymentRequestStatus;
}) =>
  role === "director" ||
  (isOwner && canSoftDeleteOwnRequest(role, status));

export const canReviewAccounting = (
  role: UserRole,
  status: PaymentRequestStatus,
) => role === "accountant" && status === "pending_accounting";

export const canUndoAccountingReview = (
  role: UserRole,
  status: PaymentRequestStatus,
) =>
  role === "accountant" &&
  (status === "director_approved" || status === "accounting_rejected");

export const canMarkAsPaid = (
  role: UserRole,
  status: PaymentRequestStatus,
) =>
  (role === "accountant" || role === "director") &&
  (status === "pending_director" || status === "director_approved");

export const MAX_NOTIFICATIONS = 50;
export const NOTIFICATION_PREVIEW_LIMIT = 8;

export const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  payment_request_created: "Đề nghị mới",
  payment_request_pending_accounting: "Chờ kế toán",
  payment_request_accounting_rejected: "Kế toán từ chối",
  payment_request_accounting_approved: "Kế toán đã duyệt",
  payment_request_pending_director: "Chờ giám đốc xử lý",
  payment_request_director_rejected: "Giám đốc từ chối",
  payment_request_paid: "Đã thanh toán",
  payment_request_deleted: "Đã xoá",
  payment_request_restored: "Đã khôi phục",
  payment_request_review_undone: "Hoàn tác xử lý",
  payment_request_director_note_updated: "Ghi chú giám đốc",
  payment_bill_uploaded: "Có chứng từ thanh toán",
  payment_attachment_uploaded: "Có tệp bổ sung",
};

export const DEPRECATED_NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  payment_request_director_approved: "Đã xử lý",
  payment_request_approved: "Đã xử lý",
  payment_request_director_action: "Cập nhật từ giám đốc",
  request_created: "Đề nghị mới",
  accounting_approved: "Kế toán đã duyệt",
  accounting_rejected: "Kế toán từ chối",
  director_approved: "Đã xử lý",
  director_rejected: "Giám đốc từ chối",
  marked_paid: "Đã thanh toán",
};

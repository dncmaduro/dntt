import type { PaymentRequestRow, ProfileRow } from "@/types/database";
import type { UserRole } from "@/lib/constants";

export type PaymentQrEmployeeOption = Pick<ProfileRow, "id" | "full_name"> & {
  role: UserRole;
};

export type PaymentQrRecentRequest = Pick<
  PaymentRequestRow,
  | "amount"
  | "created_at"
  | "id"
  | "description"
  | "payment_date"
  | "status"
  | "title"
> & {
  attachment_file_name: string | null;
  attachment_file_type: string | null;
  attachment_preview_url: string | null;
};

export type PaymentQrUnpaidRequestList = {
  available_years: number[];
  items: PaymentQrRecentRequest[];
  month: number | null;
  page: number;
  page_size: number;
  total_amount: number;
  total_items: number;
  total_pages: number;
  year: number | null;
};

export type SelectedEmployeePaymentQr = Pick<
  ProfileRow,
  "id" | "full_name" | "qr_payment_url"
> & {
  role: UserRole;
  qr_preview_url: string | null;
  unpaid_request_count: number;
  unpaid_total_amount: number;
  unpaid_requests: PaymentQrUnpaidRequestList;
};

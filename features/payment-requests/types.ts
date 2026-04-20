import type {
  CategoryRow,
  NotificationRow,
  PaymentRequestAttachmentRow,
  PaymentRequestLogRow,
  PaymentRequestPaymentBillRow,
  PaymentRequestRow,
  ProfileRow,
  SubCategoryRow,
} from "@/types/database";

export type RequestOwner = Pick<
  ProfileRow,
  "id" | "full_name" | "role" | "qr_payment_url"
>;

export type AttachmentWithUrl = PaymentRequestAttachmentRow & {
  signed_url: string | null;
};

export type PaymentRequestLogWithActor = PaymentRequestLogRow & {
  actor: Pick<ProfileRow, "id" | "full_name" | "role"> | null;
};

export type PaymentBillWithUrl = PaymentRequestPaymentBillRow & {
  signed_url: string | null;
};

export type Category = CategoryRow;
export type SubCategory = SubCategoryRow;
export type SubCategoryWithCategory = SubCategory & {
  category: Category | null;
};

export type PaymentRequestListItem = PaymentRequestRow & {
  owner: RequestOwner | null;
  attachment_count: number;
  category: Category | null;
  sub_category: SubCategoryWithCategory | null;
};

export type PaymentRequestDetail = PaymentRequestRow & {
  owner: RequestOwner | null;
  attachments: AttachmentWithUrl[];
  logs: PaymentRequestLogWithActor[];
  payment_bills: PaymentBillWithUrl[];
  payment_qr_signed_url: string | null;
  category: Category | null;
  sub_category: SubCategoryWithCategory | null;
};

export type DashboardMetric = {
  label: string;
  value: number | string;
  description: string;
};

export type DashboardData = {
  metrics: DashboardMetric[];
  recentRequests: PaymentRequestListItem[];
};

export type RequestFilters = {
  category: string;
  sub_category: string;
  keyword: string;
  status: string;
  deleted: "active" | "deleted";
  from: string;
  to: string;
  creator: string;
  sort: "newest" | "oldest";
};

export type ProfileOption = Pick<ProfileRow, "id" | "full_name">;
export type NotificationItem = NotificationRow;

export type ExpenseFilters = {
  category: string;
  sub_category: string;
  payment_status: "all" | "paid";
  month: string;
};

export type ExpenseRequestListItem = PaymentRequestRow & {
  owner: RequestOwner | null;
  category: Category | null;
  sub_category: SubCategoryWithCategory | null;
};

export type ActionResult<T = void> =
  | {
      success: true;
      data?: T;
      message?: string;
    }
  | {
      success: false;
      error: string;
      fieldErrors?: Record<string, string[] | undefined>;
    };

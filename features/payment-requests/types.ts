import type {
  NotificationRow,
  PaymentRequestAttachmentRow,
  PaymentRequestLogRow,
  PaymentRequestRow,
  ProfileRow,
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

export type PaymentRequestListItem = PaymentRequestRow & {
  owner: RequestOwner | null;
  attachment_count: number;
};

export type PaymentRequestDetail = PaymentRequestRow & {
  owner: RequestOwner | null;
  attachments: AttachmentWithUrl[];
  logs: PaymentRequestLogWithActor[];
  payment_bill_signed_url: string | null;
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
  keyword: string;
  status: string;
  from: string;
  to: string;
  creator: string;
  sort: "newest" | "oldest";
};

export type ProfileOption = Pick<ProfileRow, "id" | "full_name">;
export type NotificationItem = NotificationRow;

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

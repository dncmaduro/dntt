import type {
  CategoryRow,
  PrivatePaymentRequestAttachmentRow,
  PrivatePaymentRequestLogRow,
  PrivatePaymentRequestRow,
  ProfileRow,
  SubCategoryRow,
} from "@/types/database";

export type PrivateRequestOwner = Pick<ProfileRow, "id" | "full_name" | "role">;

export type PrivateAttachmentWithUrl = PrivatePaymentRequestAttachmentRow & {
  signed_url: string | null;
};

export type PrivateRequestLogWithActor = PrivatePaymentRequestLogRow & {
  actor: Pick<ProfileRow, "id" | "full_name" | "role"> | null;
};

export type Category = CategoryRow;
export type SubCategory = SubCategoryRow;
export type SubCategoryWithCategory = SubCategory & {
  category: Category | null;
};

export type PrivateRequestListItem = PrivatePaymentRequestRow & {
  owner: PrivateRequestOwner | null;
  attachment_count: number;
  category: Category | null;
  sub_category: SubCategoryWithCategory | null;
};

export type PrivateRequestDetail = PrivatePaymentRequestRow & {
  owner: PrivateRequestOwner | null;
  attachments: PrivateAttachmentWithUrl[];
  logs: PrivateRequestLogWithActor[];
  category: Category | null;
  sub_category: SubCategoryWithCategory | null;
};

export type PrivateRequestFilters = {
  category: string;
  sub_category: string;
  keyword: string;
  deleted: "active" | "deleted";
  from: string;
  to: string;
  creator: string;
  sort: "newest" | "oldest";
};

export type PrivateExpenseFilters = {
  category: string;
  sub_category: string;
  month: string;
};

export type PrivateExpenseRequestListItem = PrivateRequestListItem;

export type PrivateDashboardMetric = {
  label: string;
  value: number | string;
  description: string;
};

export type PrivateDashboardData = {
  metrics: PrivateDashboardMetric[];
  recentRequests: PrivateRequestListItem[];
};

export type PrivatePaginatedList<T> = {
  items: T[];
  page: number;
  pageSize: number;
  totalAmount?: number;
  totalItems: number;
  totalPages: number;
};

export type PrivateActionResult<T = void> =
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

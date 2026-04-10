import {
  ACTIVE_PAYMENT_REQUEST_STATUSES,
  ROLES,
  REQUEST_SORT_OPTIONS,
  type PaymentRequestStatus,
  type UserRole,
} from "@/lib/constants";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { formatCurrency, toPlainString } from "@/lib/utils";
import { canViewGlobalRequests } from "@/lib/auth/permissions";
import { getPaymentBillPreviewUrl } from "@/features/payment-requests/payment-bill-storage";
import type {
  DashboardData,
  PaymentRequestLogWithActor,
  PaymentRequestDetail,
  PaymentRequestListItem,
  ProfileOption,
  RequestFilters,
} from "@/features/payment-requests/types";
import { STORAGE_BUCKET } from "@/lib/constants";

const REQUEST_BASE_SELECT = `
  *,
  owner:profiles!payment_requests_user_id_fkey (
    id,
    full_name,
    role,
    qr_payment_url
  ),
  attachments:payment_request_attachments (
    id
  )
`;

type RequestListRow = Omit<PaymentRequestListItem, "attachment_count"> & {
  attachments: { id: string }[] | null;
};

type EmployeeFilterRow = {
  full_name: string | null;
  id: string;
  role: string | null;
};

const normalizeRole = (value?: string | null): UserRole | null => {
  const normalizedValue =
    typeof value === "string" ? value.trim().toLowerCase() : "";

  return ROLES.includes(normalizedValue as UserRole)
    ? (normalizedValue as UserRole)
    : null;
};

export const parseRequestFilters = async (
  searchParams: Promise<Record<string, string | string[] | undefined>>,
): Promise<RequestFilters> => {
  const params = await searchParams;
  const status = toPlainString(params.status);
  const sort = toPlainString(params.sort);

  return {
    keyword: toPlainString(params.keyword).trim(),
    status: ACTIVE_PAYMENT_REQUEST_STATUSES.includes(status as PaymentRequestStatus)
      ? status
      : "",
    from: toPlainString(params.from),
    to: toPlainString(params.to),
    creator: toPlainString(params.creator),
    sort: REQUEST_SORT_OPTIONS.includes(sort as "newest" | "oldest")
      ? (sort as "newest" | "oldest")
      : "newest",
  };
};

export const getRequestList = async ({
  filters,
  scope,
  userId,
}: {
  filters: RequestFilters;
  scope: "mine" | "all";
  userId?: string;
}) => {
  const supabase = await createClient();

  let query = supabase
    .from("payment_requests")
    .select(REQUEST_BASE_SELECT)
    .eq("is_deleted", false);

  if (scope === "mine" && userId) {
    query = query.eq("user_id", userId);
  }

  if (scope === "all" && filters.creator) {
    query = query.eq("user_id", filters.creator);
  }

  if (filters.keyword) {
    const sanitized = filters.keyword.replaceAll(",", " ");
    query = query.or(
      `title.ilike.%${sanitized}%,description.ilike.%${sanitized}%,note.ilike.%${sanitized}%`,
    );
  }

  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  if (filters.from) {
    query = query.gte("payment_date", filters.from);
  }

  if (filters.to) {
    query = query.lte("payment_date", filters.to);
  }

  query = query.order("created_at", {
    ascending: filters.sort === "oldest",
  });

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as RequestListRow[]).map((item) => ({
    ...item,
    owner: item.owner,
    attachment_count: item.attachments?.length ?? 0,
  }));
};

export const getEmployeesForFilter = async (): Promise<ProfileOption[]> => {
  const supabase = createAdminClient() ?? (await createClient());
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role");

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as EmployeeFilterRow[])
    .filter((profile) => normalizeRole(profile.role) === "employee")
    .map((profile) => ({
      id: profile.id,
      full_name: profile.full_name,
    }))
    .sort((left, right) =>
      (left.full_name ?? "").localeCompare(right.full_name ?? "", "vi"),
    );
};

export const getPaymentRequestDetail = async (
  requestId: string,
): Promise<PaymentRequestDetail | null> => {
  const supabase = await createClient();
  const { data: request, error } = await supabase
    .from("payment_requests")
    .select(
      `
      *,
      owner:profiles!payment_requests_user_id_fkey (
        id,
        full_name,
        role,
        qr_payment_url
      )
    `,
    )
    .eq("id", requestId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }

    throw new Error(error.message);
  }

  const [{ data: attachments, error: attachmentError }, { data: logs, error: logError }] =
    await Promise.all([
      supabase
        .from("payment_request_attachments")
        .select("*")
        .eq("payment_request_id", requestId)
        .order("created_at", { ascending: true }),
      supabase
        .from("payment_request_logs")
        .select(
          `
          *,
          actor:profiles!payment_request_logs_actor_id_fkey (
            id,
            full_name,
            role
          )
        `,
        )
        .eq("payment_request_id", requestId)
        .order("created_at", { ascending: false }),
    ]);

  if (attachmentError) {
    throw new Error(attachmentError.message);
  }

  if (logError) {
    throw new Error(logError.message);
  }

  const attachmentsWithSignedUrls = await Promise.all(
    (attachments ?? []).map(async (attachment) => {
      const { data } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(attachment.file_path, 60 * 60);

      return {
        ...attachment,
        signed_url: data?.signedUrl ?? null,
      };
    }),
  );
  const paymentBillSignedUrl = await getPaymentBillPreviewUrl(request.payment_bill_path);

  return {
    ...request,
    owner: request.owner,
    attachments: attachmentsWithSignedUrls,
    logs: (logs ?? []) as PaymentRequestLogWithActor[],
    payment_bill_signed_url: paymentBillSignedUrl,
  };
};

const countRequests = async ({
  role,
  userId,
  statuses,
}: {
  role: UserRole;
  userId: string;
  statuses?: PaymentRequestStatus[];
}) => {
  const supabase = await createClient();
  let query = supabase
    .from("payment_requests")
    .select("*", { count: "exact", head: true })
    .eq("is_deleted", false);

  if (!canViewGlobalRequests(role)) {
    query = query.eq("user_id", userId);
  }

  if (statuses?.length === 1) {
    query = query.eq("status", statuses[0]);
  }

  if (statuses && statuses.length > 1) {
    query = query.in("status", statuses);
  }

  const { count, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
};

const sumRequestAmount = async ({
  role,
  userId,
  statuses,
}: {
  role: UserRole;
  userId: string;
  statuses?: PaymentRequestStatus[];
}) => {
  const supabase = await createClient();
  let query = supabase
    .from("payment_requests")
    .select("amount")
    .eq("is_deleted", false);

  if (!canViewGlobalRequests(role)) {
    query = query.eq("user_id", userId);
  }

  if (statuses?.length === 1) {
    query = query.eq("status", statuses[0]);
  }

  if (statuses && statuses.length > 1) {
    query = query.in("status", statuses);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as Array<{ amount: number | null }>).reduce(
    (total, row) => total + (row.amount ?? 0),
    0,
  );
};

export const getDashboardData = async ({
  role,
  userId,
}: {
  role: UserRole;
  userId: string;
}): Promise<DashboardData> => {
  const metrics = await (async () => {
    if (role === "employee") {
      const [total, unpaidCount, unpaidAmount, paidCount] = await Promise.all([
        countRequests({ role, userId }),
        countRequests({
          role,
          userId,
          statuses: [
            "pending_accounting",
            "accounting_rejected",
            "pending_director",
            "director_rejected",
            "director_approved",
          ],
        }),
        sumRequestAmount({
          role,
          userId,
          statuses: [
            "pending_accounting",
            "accounting_rejected",
            "pending_director",
            "director_rejected",
            "director_approved",
          ],
        }),
        countRequests({
          role,
          userId,
          statuses: ["paid"],
        }),
      ]);

      return [
        {
          label: "Tổng đề nghị",
          value: total,
          description: "Toàn bộ DNTT bạn đã tạo",
        },
        {
          label: "Chưa được thanh toán",
          value: unpaidCount,
          description: "Đang chờ hoặc chưa hoàn tất chi trả",
        },
        {
          label: "Chưa thanh toán",
          value: formatCurrency(unpaidAmount),
          description: "Tổng số tiền chưa được thanh toán",
        },
        {
          label: "Đã được thanh toán",
          value: paidCount,
          description: "Đã hoàn tất chi trả",
        },
      ];
    }

    if (role === "accountant") {
      const [pendingAccounting, approved, paid, total] =
        await Promise.all([
          countRequests({
            role,
            userId,
            statuses: ["pending_accounting"],
          }),
          countRequests({
            role,
            userId,
            statuses: ["pending_director", "director_approved"],
          }),
          countRequests({
            role,
            userId,
            statuses: ["paid"],
          }),
          countRequests({ role, userId }),
        ]);

      return [
        {
          label: "Chờ kế toán",
          value: pendingAccounting,
          description: "Cần xác nhận hồ sơ ngay",
        },
        {
          label: "Đã duyệt",
          value: approved,
          description: "Đã sẵn sàng để thanh toán",
        },
        {
          label: "Đã thanh toán",
          value: paid,
          description: "Đã hoàn tất chi trả",
        },
        {
          label: "Toàn hệ thống",
          value: total,
          description: "Tổng số DNTT đang quản lý",
        },
      ];
    }

    const [readyToPay, paid, rejected, total] = await Promise.all([
      countRequests({
        role,
        userId,
        statuses: ["pending_director", "director_approved"],
      }),
      countRequests({
        role,
        userId,
        statuses: ["paid"],
      }),
      countRequests({
        role,
        userId,
        statuses: ["accounting_rejected", "director_rejected"],
      }),
      countRequests({ role, userId }),
    ]);

    return [
      {
        label: "Chờ thanh toán",
        value: readyToPay,
        description: "Các hồ sơ đã được duyệt và chờ chi trả",
      },
      {
        label: "Đã thanh toán",
        value: paid,
        description: "Các khoản đã hoàn tất chi trả",
      },
      {
        label: "Đã từ chối",
        value: rejected,
        description: "Hồ sơ bị trả về để bổ sung",
      },
      {
        label: "Toàn hệ thống",
        value: total,
        description: "Tổng số DNTT đã phát sinh",
      },
    ];
  })();

  const recentRequests = await getRequestList({
    filters: {
      keyword: "",
      status: "",
      from: "",
      to: "",
      creator: "",
      sort: "newest",
    },
    scope: canViewGlobalRequests(role) ? "all" : "mine",
    userId,
  });

  return {
    metrics,
    recentRequests: recentRequests.slice(0, 5),
  };
};

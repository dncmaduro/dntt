import {
  ACTIVE_PAYMENT_REQUEST_STATUSES,
  ROLES,
  REQUEST_SORT_OPTIONS,
  type PaymentRequestStatus,
  type UserRole,
} from '@/lib/constants';
import { createClient } from '@/lib/supabase/server';
import { formatCurrency, toPlainString } from '@/lib/utils';
import { canViewGlobalRequests } from '@/lib/auth/permissions';
import { getPaymentBillPreviewUrl } from '@/features/payment-requests/payment-bill-storage';
import { getPaymentRequestQrPreviewUrl } from '@/features/payment-requests/payment-request-qr-storage';
import type {
  AttachmentWithUrl,
  Category,
  DashboardData,
  ExpenseFilters,
  ExpenseRequestListItem,
  PaymentBillWithUrl,
  PaymentRequestLogWithActor,
  PaymentRequestDetail,
  PaymentRequestListItem,
  ProfileOption,
  RequestOwner,
  RequestFilters,
  SubCategory,
  SubCategoryWithCategory,
} from '@/features/payment-requests/types';
import { STORAGE_BUCKET } from '@/lib/constants';

const REQUEST_OWNER_SELECT = `
  *,
  owner:profiles!payment_requests_user_id_fkey (
    id,
    full_name,
    role,
    qr_payment_url
  )
`;

const REQUEST_LIST_SELECT = `
  ${REQUEST_OWNER_SELECT},
  attachments:payment_request_attachments (
    id
  )
`;

const EXPENSE_LIST_SELECT = `
  ${REQUEST_OWNER_SELECT},
  attachments:payment_request_attachments (
    id,
    created_at,
    created_by,
    file_name,
    file_path,
    file_type,
    payment_request_id
  )
`;

type RequestWithOwnerRow = {
  owner: RequestOwner | null;
  sub_category_id: string | null;
};

type RequestListRow = Omit<
  PaymentRequestListItem,
  'attachment_count' | 'category' | 'sub_category'
> & {
  attachments: { id: string }[] | null;
};

type ExpenseListRow = Omit<
  ExpenseRequestListItem,
  "attachment_count" | "category" | "sub_category"
> & {
  attachments: AttachmentWithUrl[] | null;
};

type EmployeeFilterRow = {
  full_name: string | null;
  id: string;
  role: string | null;
};

type RequestTaxonomyMaps = {
  subCategoryById: Map<string, SubCategoryWithCategory>;
};

const REQUEST_FILTER_DEFAULTS: RequestFilters = {
  category: '',
  sub_category: '',
  keyword: '',
  status: '',
  deleted: 'active',
  from: '',
  to: '',
  creator: '',
  sort: 'newest',
};

const EXPENSE_FILTER_DEFAULTS: ExpenseFilters = {
  category: '',
  sub_category: '',
  payment_status: 'all',
  month: '',
};

const normalizeRole = (value?: string | null): UserRole | null => {
  const normalizedValue =
    typeof value === 'string' ? value.trim().toLowerCase() : '';

  return ROLES.includes(normalizedValue as UserRole)
    ? (normalizedValue as UserRole)
    : null;
};

const getCategoryMap = (categories: Category[]) =>
  new Map(categories.map((category) => [category.id, category]));

const getRequestTaxonomyMaps = async ({
  supabase,
  subCategoryIds,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  subCategoryIds: string[];
}): Promise<RequestTaxonomyMaps> => {
  if (!subCategoryIds.length) {
    return {
      subCategoryById: new Map(),
    };
  }

  const { data: subCategories, error: subCategoryError } = await supabase
    .from('sub_categories')
    .select('id, category_id, name')
    .in('id', subCategoryIds)
    .order('name', { ascending: true });

  if (subCategoryError) {
    throw new Error(subCategoryError.message);
  }

  const categoryIds = Array.from(
    new Set((subCategories ?? []).map((item) => item.category_id)),
  );

  const { data: categories, error: categoryError } = await supabase
    .from('categories')
    .select('id, name')
    .in('id', categoryIds)
    .order('name', { ascending: true });

  if (categoryError) {
    throw new Error(categoryError.message);
  }

  const categoryById = getCategoryMap((categories ?? []) as Category[]);
  const subCategoryById = new Map(
    ((subCategories ?? []) as SubCategory[]).map((subCategory) => [
      subCategory.id,
      {
        ...subCategory,
        category: categoryById.get(subCategory.category_id) ?? null,
      },
    ]),
  );

  return {
    subCategoryById,
  };
};

const enrichRequestsWithTaxonomy = async <
  TItem extends RequestWithOwnerRow & Record<string, unknown>,
>({
  items,
  supabase,
}: {
  items: TItem[];
  supabase: Awaited<ReturnType<typeof createClient>>;
}) => {
  const subCategoryIds = Array.from(
    new Set(
      items
        .map((item) => item.sub_category_id)
        .filter((value): value is string => Boolean(value)),
    ),
  );
  const { subCategoryById } = await getRequestTaxonomyMaps({
    supabase,
    subCategoryIds,
  });

  return items.map((item) => {
    const subCategory =
      item.sub_category_id != null
        ? (subCategoryById.get(item.sub_category_id) ?? null)
        : null;

    return {
      ...item,
      category: subCategory?.category ?? null,
      sub_category: subCategory,
    };
  });
};

const getSubCategoryIdsByCategory = async ({
  categoryId,
  supabase,
}: {
  categoryId: string;
  supabase: Awaited<ReturnType<typeof createClient>>;
}) => {
  const { data, error } = await supabase
    .from('sub_categories')
    .select('id')
    .eq('category_id', categoryId);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((item) => item.id);
};

const getMonthRange = (month: string) => {
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return null;
  }

  const [yearValue, monthValue] = month.split('-').map(Number);
  const start = new Date(Date.UTC(yearValue, monthValue - 1, 1));
  const end = new Date(Date.UTC(yearValue, monthValue, 1));

  const formatDatePart = (value: Date) => value.toISOString().slice(0, 10);

  return {
    from: formatDatePart(start),
    toExclusive: formatDatePart(end),
  };
};

export const parseRequestFilters = async (
  searchParams: Promise<Record<string, string | string[] | undefined>>,
): Promise<RequestFilters> => {
  const params = await searchParams;
  const category = toPlainString(params.category);
  const status = toPlainString(params.status);
  const subCategory = category ? toPlainString(params.sub_category) : '';
  const sort = toPlainString(params.sort);

  return {
    ...REQUEST_FILTER_DEFAULTS,
    category,
    sub_category: subCategory,
    keyword: toPlainString(params.keyword).trim(),
    status: ACTIVE_PAYMENT_REQUEST_STATUSES.includes(
      status as (typeof ACTIVE_PAYMENT_REQUEST_STATUSES)[number],
    )
      ? status
      : '',
    deleted: toPlainString(params.deleted) === 'deleted' ? 'deleted' : 'active',
    from: toPlainString(params.from),
    to: toPlainString(params.to),
    creator: toPlainString(params.creator),
    sort: REQUEST_SORT_OPTIONS.includes(sort as 'newest' | 'oldest')
      ? (sort as 'newest' | 'oldest')
      : 'newest',
  };
};

export const parseExpenseFilters = async (
  searchParams: Promise<Record<string, string | string[] | undefined>>,
): Promise<ExpenseFilters> => {
  const params = await searchParams;
  const category = toPlainString(params.category);
  const month = toPlainString(params.month);
  const paymentStatus = toPlainString(params.payment_status);

  return {
    ...EXPENSE_FILTER_DEFAULTS,
    category,
    sub_category: category ? toPlainString(params.sub_category) : '',
    payment_status: paymentStatus === 'paid' ? 'paid' : 'all',
    month: /^\d{4}-\d{2}$/.test(month) ? month : '',
  };
};

export const getCategories = async (): Promise<Category[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('categories')
    .select('id, name')
    .order('name', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as Category[];
};

export const getSubCategories = async ({
  categoryId,
}: {
  categoryId?: string;
} = {}): Promise<SubCategory[]> => {
  const supabase = await createClient();
  let query = supabase
    .from('sub_categories')
    .select('id, category_id, name')
    .order('name', { ascending: true });

  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as SubCategory[];
};

export const getRequestList = async ({
  filters,
  scope,
  userId,
}: {
  filters: RequestFilters;
  scope: 'mine' | 'all';
  userId?: string;
}): Promise<PaymentRequestListItem[]> => {
  const supabase = await createClient();

  let query = supabase.from('payment_requests').select(REQUEST_LIST_SELECT);

  if (filters.category) {
    const categorySubCategoryIds = await getSubCategoryIdsByCategory({
      categoryId: filters.category,
      supabase,
    });

    if (!categorySubCategoryIds.length) {
      return [];
    }

    query = query.in('sub_category_id', categorySubCategoryIds);
  }

  if (filters.deleted === 'deleted') {
    query = query.eq('is_deleted', true);
  } else {
    query = query.eq('is_deleted', false);
  }

  if (scope === 'mine' && userId) {
    query = query.eq('user_id', userId);
  }

  if (scope === 'all' && filters.creator) {
    query = query.eq('user_id', filters.creator);
  }

  if (filters.keyword) {
    const sanitized = filters.keyword.replaceAll(',', ' ');
    query = query.or(
      `title.ilike.%${sanitized}%,description.ilike.%${sanitized}%`,
    );
  }

  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  if (filters.sub_category) {
    query = query.eq('sub_category_id', filters.sub_category);
  }

  if (filters.from) {
    query = query.gte('payment_date', filters.from);
  }

  if (filters.to) {
    query = query.lte('payment_date', filters.to);
  }

  query = query.order('created_at', {
    ascending: filters.sort === 'oldest',
  });

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const items = await enrichRequestsWithTaxonomy({
    items: (data ?? []) as RequestListRow[],
    supabase,
  });

  return items.map((item) => ({
    ...item,
    owner: item.owner,
    attachment_count: item.attachments?.length ?? 0,
  })) as PaymentRequestListItem[];
};

export const getExpenseRequestList = async ({
  filters,
}: {
  filters: ExpenseFilters;
}): Promise<ExpenseRequestListItem[]> => {
  const supabase = await createClient();
  let query = supabase.from('payment_requests').select(EXPENSE_LIST_SELECT);

  query = query.eq('is_deleted', false);

  if (filters.category) {
    const categorySubCategoryIds = await getSubCategoryIdsByCategory({
      categoryId: filters.category,
      supabase,
    });

    if (!categorySubCategoryIds.length) {
      return [];
    }

    query = query.in('sub_category_id', categorySubCategoryIds);
  }

  if (filters.sub_category) {
    query = query.eq('sub_category_id', filters.sub_category);
  }

  if (filters.payment_status === 'paid') {
    query = query.eq('status', 'paid');
  }

  if (filters.month) {
    const monthRange = getMonthRange(filters.month);

    if (monthRange) {
      query = query
        .gte('payment_date', monthRange.from)
        .lt('payment_date', monthRange.toExclusive);
    }
  }

  query = query.order('payment_date', { ascending: false });

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const items = await enrichRequestsWithTaxonomy({
    items: (data ?? []) as ExpenseListRow[],
    supabase,
  });

  const itemsWithAttachmentUrls = await Promise.all(
    items.map(async (item) => ({
      ...item,
      attachments: await Promise.all(
        (item.attachments ?? []).map(async (attachment) => {
          const { data: signedUrlData } = await supabase.storage
            .from(STORAGE_BUCKET)
            .createSignedUrl(attachment.file_path, 60 * 60);

          return {
            ...attachment,
            signed_url: signedUrlData?.signedUrl ?? null,
          };
        }),
      ),
    })),
  );

  return itemsWithAttachmentUrls.map((item) => ({
    ...item,
    attachment_count: item.attachments.length,
  })) as ExpenseRequestListItem[];
};

export const getEmployeesForFilter = async (): Promise<ProfileOption[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role');

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as EmployeeFilterRow[])
    .filter((profile) => normalizeRole(profile.role) === 'employee')
    .map((profile) => ({
      id: profile.id,
      full_name: profile.full_name,
    }))
    .sort((left, right) =>
      (left.full_name ?? '').localeCompare(right.full_name ?? '', 'vi'),
    );
};

export const getPaymentRequestDetail = async (
  requestId: string,
): Promise<PaymentRequestDetail | null> => {
  const supabase = await createClient();
  const { data: request, error } = await supabase
    .from('payment_requests')
    .select(REQUEST_OWNER_SELECT)
    .eq('id', requestId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!request) {
    return null;
  }

  const [
    { data: attachments, error: attachmentError },
    { data: paymentBills, error: paymentBillError },
    { data: logs, error: logError },
  ] = await Promise.all([
    supabase
      .from('payment_request_attachments')
      .select('*')
      .eq('payment_request_id', requestId)
      .order('created_at', { ascending: true }),
    supabase
      .from('payment_request_payment_bills')
      .select('*')
      .eq('payment_request_id', requestId)
      .order('created_at', { ascending: true }),
    supabase
      .from('payment_request_logs')
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
      .eq('payment_request_id', requestId)
      .order('created_at', { ascending: false }),
  ]);

  if (attachmentError) {
    throw new Error(attachmentError.message);
  }

  if (paymentBillError) {
    throw new Error(paymentBillError.message);
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
  const [paymentBillsWithSignedUrls, paymentQrSignedUrl] = await Promise.all([
    Promise.all(
      (paymentBills ?? []).map(async (bill) => ({
        ...bill,
        signed_url: await getPaymentBillPreviewUrl(bill.file_path),
      })),
    ),
    getPaymentRequestQrPreviewUrl(request.payment_qr_path),
  ]);
  const [requestWithTaxonomy] = await enrichRequestsWithTaxonomy({
    items: [request as RequestWithOwnerRow & Record<string, unknown>],
    supabase,
  });

  return {
    ...requestWithTaxonomy,
    attachments: attachmentsWithSignedUrls,
    logs: (logs ?? []) as PaymentRequestLogWithActor[],
    payment_bills: paymentBillsWithSignedUrls as PaymentBillWithUrl[],
    payment_qr_signed_url: paymentQrSignedUrl,
  } as PaymentRequestDetail;
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
    .from('payment_requests')
    .select('*', { count: 'exact', head: true })
    .eq('is_deleted', false);

  if (!canViewGlobalRequests(role)) {
    query = query.eq('user_id', userId);
  }

  if (statuses?.length === 1) {
    query = query.eq('status', statuses[0]);
  }

  if (statuses && statuses.length > 1) {
    query = query.in('status', statuses);
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
    .from('payment_requests')
    .select('amount')
    .eq('is_deleted', false);

  if (!canViewGlobalRequests(role)) {
    query = query.eq('user_id', userId);
  }

  if (statuses?.length === 1) {
    query = query.eq('status', statuses[0]);
  }

  if (statuses && statuses.length > 1) {
    query = query.in('status', statuses);
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
    if (role === 'employee') {
      const [total, unpaidCount, unpaidAmount, paidCount] = await Promise.all([
        countRequests({ role, userId }),
        countRequests({
          role,
          userId,
          statuses: [
            'pending_accounting',
            'accounting_rejected',
            'pending_director',
            'director_rejected',
            'director_approved',
          ],
        }),
        sumRequestAmount({
          role,
          userId,
          statuses: [
            'pending_accounting',
            'accounting_rejected',
            'pending_director',
            'director_rejected',
            'director_approved',
          ],
        }),
        countRequests({
          role,
          userId,
          statuses: ['paid'],
        }),
      ]);

      return [
        {
          label: 'Tổng đề nghị',
          value: total,
          description: 'Toàn bộ DNTT bạn đã tạo',
        },
        {
          label: 'Chưa được thanh toán',
          value: unpaidCount,
          description: 'Đang chờ hoặc chưa hoàn tất chi trả',
        },
        {
          label: 'Chưa thanh toán',
          value: formatCurrency(unpaidAmount),
          description: 'Tổng số tiền chưa được thanh toán',
        },
        {
          label: 'Đã được thanh toán',
          value: paidCount,
          description: 'Đã hoàn tất chi trả',
        },
      ];
    }

    if (role === 'accountant') {
      const [pendingAccounting, approved, paid, total] = await Promise.all([
        countRequests({
          role,
          userId,
          statuses: ['pending_accounting'],
        }),
        countRequests({
          role,
          userId,
          statuses: ['pending_director', 'director_approved'],
        }),
        countRequests({
          role,
          userId,
          statuses: ['paid'],
        }),
        countRequests({ role, userId }),
      ]);

      return [
        {
          label: 'Chờ kế toán',
          value: pendingAccounting,
          description: 'Cần xác nhận hồ sơ ngay',
        },
        {
          label: 'Đã duyệt',
          value: approved,
          description: 'Đã sẵn sàng để thanh toán',
        },
        {
          label: 'Đã thanh toán',
          value: paid,
          description: 'Đã hoàn tất chi trả',
        },
        {
          label: 'Toàn hệ thống',
          value: total,
          description: 'Tổng số DNTT đang quản lý',
        },
      ];
    }

    const [readyToPay, paid, rejected, total] = await Promise.all([
      countRequests({
        role,
        userId,
        statuses: ['pending_director', 'director_approved'],
      }),
      countRequests({
        role,
        userId,
        statuses: ['paid'],
      }),
      countRequests({
        role,
        userId,
        statuses: ['accounting_rejected', 'director_rejected'],
      }),
      countRequests({ role, userId }),
    ]);

    return [
      {
        label: 'Chờ thanh toán',
        value: readyToPay,
        description: 'Các hồ sơ đã được duyệt và chờ chi trả',
      },
      {
        label: 'Đã thanh toán',
        value: paid,
        description: 'Các khoản đã hoàn tất chi trả',
      },
      {
        label: 'Đã từ chối',
        value: rejected,
        description: 'Hồ sơ bị trả về để bổ sung',
      },
      {
        label: 'Toàn hệ thống',
        value: total,
        description: 'Tổng số DNTT đã phát sinh',
      },
    ];
  })();

  const recentRequests = await getRequestList({
    filters: REQUEST_FILTER_DEFAULTS,
    scope: canViewGlobalRequests(role) ? 'all' : 'mine',
    userId,
  });

  return {
    metrics,
    recentRequests: recentRequests.slice(0, 5),
  };
};

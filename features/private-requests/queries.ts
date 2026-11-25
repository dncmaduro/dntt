import { cache } from "react";

import { getCategories, getSubCategories } from "@/features/payment-requests/queries";
import type {
  Category,
  PrivateDashboardData,
  PrivateExpenseFilters,
  PrivateExpenseRequestListItem,
  PrivateRequestDetail,
  PrivateRequestFilters,
  PrivateRequestListItem,
  PrivatePaginatedList,
  PrivateRequestOwner,
  SubCategory,
  SubCategoryWithCategory,
} from "@/features/private-requests/types";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, toPlainString } from "@/lib/utils";

const PRIVATE_STORAGE_BUCKET = "private-payment-request-files";
const PRIVATE_REQUEST_LIST_PAGE_SIZE = 20;
const PRIVATE_EXPENSE_LIST_PAGE_SIZE = 20;

const PRIVATE_REQUEST_OWNER_SELECT = `
  *,
  owner:profiles!private_payment_requests_user_id_fkey (
    id,
    full_name,
    role
  )
`;

const PRIVATE_REQUEST_LIST_SELECT = `
  ${PRIVATE_REQUEST_OWNER_SELECT},
  attachments:private_payment_request_attachments (
    id
  )
`;

type PrivateRequestListRow = Omit<
  PrivateRequestListItem,
  "attachment_count" | "category" | "sub_category"
> & {
  attachments: { id: string }[] | null;
};

const PRIVATE_REQUEST_FILTER_DEFAULTS: PrivateRequestFilters = {
  category: "",
  sub_category: "",
  keyword: "",
  deleted: "active",
  from: "",
  to: "",
  creator: "",
  sort: "newest",
};

const PRIVATE_EXPENSE_FILTER_DEFAULTS: PrivateExpenseFilters = {
  category: "",
  sub_category: "",
  month: "",
};

const getSubCategoryIdsByCategory = async ({
  categoryId,
  supabase,
}: {
  categoryId: string;
  supabase: Awaited<ReturnType<typeof createClient>>;
}) => {
  const { data, error } = await supabase
    .from("sub_categories")
    .select("id")
    .eq("category_id", categoryId);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((item) => item.id);
};

const getTaxonomyBySubCategory = async ({
  subCategoryIds,
  supabase,
}: {
  subCategoryIds: string[];
  supabase: Awaited<ReturnType<typeof createClient>>;
}) => {
  if (!subCategoryIds.length) {
    return new Map<string, SubCategoryWithCategory>();
  }

  const { data: subCategories, error: subCategoryError } = await supabase
    .from("sub_categories")
    .select("id, category_id, name")
    .in("id", subCategoryIds);

  if (subCategoryError) {
    throw new Error(subCategoryError.message);
  }

  const categoryIds = Array.from(
    new Set((subCategories ?? []).map((item) => item.category_id)),
  );
  const { data: categories, error: categoryError } = await supabase
    .from("categories")
    .select("id, name")
    .in("id", categoryIds);

  if (categoryError) {
    throw new Error(categoryError.message);
  }

  const categoryById = new Map(
    ((categories ?? []) as Category[]).map((category) => [category.id, category]),
  );

  return new Map(
    ((subCategories ?? []) as SubCategory[]).map((subCategory) => [
      subCategory.id,
      {
        ...subCategory,
        category: categoryById.get(subCategory.category_id) ?? null,
      },
    ]),
  );
};

const enrichRequests = async (
  items: PrivateRequestListRow[],
  supabase: Awaited<ReturnType<typeof createClient>>,
) => {
  const subCategoryIds = Array.from(
    new Set(
      items
        .map((item) => item.sub_category_id)
        .filter((value): value is string => Boolean(value)),
    ),
  );
  const subCategoryById = await getTaxonomyBySubCategory({
    subCategoryIds,
    supabase,
  });

  return items.map((item) => {
    const subCategory = item.sub_category_id
      ? subCategoryById.get(item.sub_category_id) ?? null
      : null;

    return {
      ...item,
      category: subCategory?.category ?? null,
      sub_category: subCategory,
      attachment_count: item.attachments?.length ?? 0,
    } as PrivateRequestListItem;
  });
};

export const parsePrivateRequestFilters = async (
  searchParams: Promise<Record<string, string | string[] | undefined>>,
): Promise<PrivateRequestFilters> => {
  const params = await searchParams;
  const sort = toPlainString(params.sort);

  return {
    ...PRIVATE_REQUEST_FILTER_DEFAULTS,
    category: toPlainString(params.category),
    sub_category: toPlainString(params.category)
      ? toPlainString(params.sub_category)
      : "",
    keyword: toPlainString(params.keyword).trim(),
    deleted: toPlainString(params.deleted) === "deleted" ? "deleted" : "active",
    from: toPlainString(params.from),
    to: toPlainString(params.to),
    creator: toPlainString(params.creator),
    sort: sort === "oldest" ? "oldest" : "newest",
  };
};

export const parsePrivateExpenseFilters = async (
  searchParams: Promise<Record<string, string | string[] | undefined>>,
): Promise<PrivateExpenseFilters> => {
  const params = await searchParams;
  const category = toPlainString(params.category);
  const month = toPlainString(params.month);

  return {
    ...PRIVATE_EXPENSE_FILTER_DEFAULTS,
    category,
    sub_category: category ? toPlainString(params.sub_category) : "",
    month: /^\d{4}-\d{2}$/.test(month) ? month : "",
  };
};

const getMonthDateRange = (month: string) => {
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return null;
  }

  const [year, monthNumber] = month.split("-").map(Number);
  const start = `${year}-${String(monthNumber).padStart(2, "0")}-01`;
  const endDate = new Date(Date.UTC(year, monthNumber, 1));

  return {
    from: start,
    toExclusive: endDate.toISOString().slice(0, 10),
  };
};

const getPrivateRequestListData = async ({
  filters,
  limit,
  page,
  pageSize,
}: {
  filters: PrivateRequestFilters;
  limit?: number;
  page?: number;
  pageSize?: number;
}): Promise<{ items: PrivateRequestListItem[]; totalItems: number }> => {
  const supabase = await createClient();
  let query = supabase
    .from("private_payment_requests")
    .select(PRIVATE_REQUEST_LIST_SELECT, { count: "exact" });

  if (filters.category) {
    const categorySubCategoryIds = await getSubCategoryIdsByCategory({
      categoryId: filters.category,
      supabase,
    });

    if (!categorySubCategoryIds.length) {
      return { items: [], totalItems: 0 };
    }

    query = query.in("sub_category_id", categorySubCategoryIds);
  }

  query = query.eq("is_deleted", filters.deleted === "deleted");

  if (filters.creator) {
    query = query.eq("user_id", filters.creator);
  }

  if (filters.keyword) {
    const sanitized = filters.keyword.replaceAll(",", " ");
    query = query.or(
      `title.ilike.%${sanitized}%,description.ilike.%${sanitized}%`,
    );
  }

  if (filters.sub_category) {
    query = query.eq("sub_category_id", filters.sub_category);
  }

  if (filters.from) {
    query = query.gte("payment_date", filters.from);
  }

  if (filters.to) {
    query = query.lte("payment_date", filters.to);
  }

  query = query.order("created_at", { ascending: filters.sort === "oldest" });

  if (limit) {
    query = query.limit(limit);
  }

  if (page && pageSize) {
    const from = (page - 1) * pageSize;
    query = query.range(from, from + pageSize - 1);
  }

  const { data, error, count } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const items = await enrichRequests(
    (data ?? []) as PrivateRequestListRow[],
    supabase,
  );

  return {
    items,
    totalItems: count ?? 0,
  };
};

export const getPrivateRequestListPage = async ({
  filters,
  page,
}: {
  filters: PrivateRequestFilters;
  page: number;
}): Promise<PrivatePaginatedList<PrivateRequestListItem>> => {
  const result = await getPrivateRequestListData({
    filters,
    page,
    pageSize: PRIVATE_REQUEST_LIST_PAGE_SIZE,
  });

  return {
    items: result.items,
    page,
    pageSize: PRIVATE_REQUEST_LIST_PAGE_SIZE,
    totalItems: result.totalItems,
    totalPages: Math.max(
      1,
      Math.ceil(result.totalItems / PRIVATE_REQUEST_LIST_PAGE_SIZE),
    ),
  };
};

export const getPrivateExpenseRequestListPage = async ({
  filters,
  page,
}: {
  filters: PrivateExpenseFilters;
  page: number;
}): Promise<PrivatePaginatedList<PrivateExpenseRequestListItem>> => {
  const supabase = await createClient();
  let query = supabase
    .from("private_payment_requests")
    .select(PRIVATE_REQUEST_LIST_SELECT, { count: "exact" })
    .eq("is_deleted", false);

  let categorySubCategoryIds: string[] | null = null;

  if (filters.category) {
    categorySubCategoryIds = await getSubCategoryIdsByCategory({
      categoryId: filters.category,
      supabase,
    });

    if (!categorySubCategoryIds.length) {
      return {
        items: [],
        page,
        pageSize: PRIVATE_EXPENSE_LIST_PAGE_SIZE,
        totalAmount: 0,
        totalItems: 0,
        totalPages: 1,
      };
    }

    query = query.in("sub_category_id", categorySubCategoryIds);
  }

  if (filters.sub_category) {
    query = query.eq("sub_category_id", filters.sub_category);
  }

  const monthRange = getMonthDateRange(filters.month);

  if (monthRange) {
    query = query
      .gte("payment_date", monthRange.from)
      .lt("payment_date", monthRange.toExclusive);
  }

  query = query
    .order("payment_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  const from = (page - 1) * PRIVATE_EXPENSE_LIST_PAGE_SIZE;
  query = query.range(from, from + PRIVATE_EXPENSE_LIST_PAGE_SIZE - 1);

  const amountQuery = supabase
    .from("private_payment_requests")
    .select("amount")
    .eq("is_deleted", false);

  if (categorySubCategoryIds) {
    amountQuery.in("sub_category_id", categorySubCategoryIds);
  }

  if (filters.sub_category) {
    amountQuery.eq("sub_category_id", filters.sub_category);
  }

  if (monthRange) {
    amountQuery
      .gte("payment_date", monthRange.from)
      .lt("payment_date", monthRange.toExclusive);
  }

  const [{ data, error, count }, { data: amounts, error: amountError }] =
    await Promise.all([query, amountQuery]);

  if (error) {
    throw new Error(error.message);
  }

  if (amountError) {
    throw new Error(amountError.message);
  }

  const items = await enrichRequests(
    (data ?? []) as PrivateRequestListRow[],
    supabase,
  );
  const totalAmount = ((amounts ?? []) as Array<{ amount: number | null }>).reduce(
    (total, item) => total + (item.amount ?? 0),
    0,
  );
  const totalItems = count ?? 0;

  return {
    items,
    page,
    pageSize: PRIVATE_EXPENSE_LIST_PAGE_SIZE,
    totalAmount,
    totalItems,
    totalPages: Math.max(1, Math.ceil(totalItems / PRIVATE_EXPENSE_LIST_PAGE_SIZE)),
  };
};

export const getPrivateExpenseRequestList = async ({
  filters,
}: {
  filters: PrivateExpenseFilters;
}): Promise<PrivateExpenseRequestListItem[]> => {
  const supabase = await createClient();
  let query = supabase
    .from("private_payment_requests")
    .select(PRIVATE_REQUEST_LIST_SELECT)
    .eq("is_deleted", false);

  if (filters.category) {
    const ids = await getSubCategoryIdsByCategory({
      categoryId: filters.category,
      supabase,
    });
    if (!ids.length) {
      return [];
    }
    query = query.in("sub_category_id", ids);
  }

  if (filters.sub_category) {
    query = query.eq("sub_category_id", filters.sub_category);
  }

  const monthRange = getMonthDateRange(filters.month);
  if (monthRange) {
    query = query
      .gte("payment_date", monthRange.from)
      .lt("payment_date", monthRange.toExclusive);
  }

  const { data, error } = await query
    .order("payment_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return enrichRequests(
    (data ?? []) as PrivateRequestListRow[],
    supabase,
  );
};

export const getPrivateRequestDetail = cache(
  async (requestId: string): Promise<PrivateRequestDetail | null> => {
    const supabase = await createClient();
    const { data: request, error: requestError } = await supabase
      .from("private_payment_requests")
      .select(PRIVATE_REQUEST_OWNER_SELECT)
      .eq("id", requestId)
      .maybeSingle();

    if (requestError) {
      throw new Error(requestError.message);
    }

    if (!request) {
      return null;
    }

    const [
      { data: attachments, error: attachmentError },
      { data: logs, error: logError },
    ] = await Promise.all([
      supabase
        .from("private_payment_request_attachments")
        .select("*")
        .eq("private_payment_request_id", requestId)
        .order("created_at", { ascending: true }),
      supabase
        .from("private_payment_request_logs")
        .select(
          `
            *,
            actor:profiles!private_payment_request_logs_actor_id_fkey (
              id,
              full_name,
              role
            )
          `,
        )
        .eq("private_payment_request_id", requestId)
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
          .from(PRIVATE_STORAGE_BUCKET)
          .createSignedUrl(attachment.file_path, 60 * 60);

        return {
          ...attachment,
          signed_url: data?.signedUrl ?? null,
        };
      }),
    );
    const [requestWithTaxonomy] = await enrichRequests(
      [
        {
          ...(request as PrivateRequestListRow),
          attachments: null,
        },
      ],
      supabase,
    );

    return {
      ...requestWithTaxonomy,
      attachments: attachmentsWithSignedUrls,
      logs: logs ?? [],
    } as PrivateRequestDetail;
  },
);

export const getPrivateRequestCreators = async (): Promise<
  Array<Pick<PrivateRequestOwner, "id" | "full_name">>
> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("role", "director")
    .order("full_name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((profile) => ({
    id: profile.id,
    full_name: profile.full_name,
  }));
};

export const getPrivateDashboardData = async (): Promise<PrivateDashboardData> => {
  const currentDate = new Date();
  const currentMonth = `${currentDate.getFullYear()}-${String(
    currentDate.getMonth() + 1,
  ).padStart(2, "0")}`;
  const defaultFilters = PRIVATE_REQUEST_FILTER_DEFAULTS;
  const defaultExpenseFilters = PRIVATE_EXPENSE_FILTER_DEFAULTS;

  const [recent, allExpenses, monthExpenses] = await Promise.all([
    getPrivateRequestListData({
      filters: defaultFilters,
      limit: 5,
    }),
    getPrivateExpenseRequestList({ filters: defaultExpenseFilters }),
    getPrivateExpenseRequestList({
      filters: { ...defaultExpenseFilters, month: currentMonth },
    }),
  ]);
  const totalAmount = allExpenses.reduce(
    (total, item) => total + (item.amount ?? 0),
    0,
  );
  const currentMonthAmount = monthExpenses.reduce(
    (total, item) => total + (item.amount ?? 0),
    0,
  );

  return {
    metrics: [
      {
        label: "Tổng DNTT riêng",
        value: recent.totalItems,
        description: "Tổng số DNTT riêng đã tạo",
      },
      {
        label: "Tổng chi phí",
        value: formatCurrency(totalAmount),
        description: "Tổng giá trị các DNTT riêng",
      },
      {
        label: "Chi phí tháng này",
        value: formatCurrency(currentMonthAmount),
        description: "Tổng chi phí theo ngày DNTT",
      },
    ],
    recentRequests: recent.items,
  };
};

export { getCategories, getSubCategories };

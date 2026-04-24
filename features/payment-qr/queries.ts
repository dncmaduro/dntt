import { cache } from "react";

import { ROLES, type UserRole } from "@/lib/constants";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { toPlainString } from "@/lib/utils";
import { getProfileQrPreviewUrl } from "@/features/profile/queries";
import { STORAGE_BUCKET } from "@/lib/constants";
import type {
  PaymentQrEmployeeOption,
  PaymentQrRecentRequest,
  SelectedEmployeePaymentQr,
} from "@/features/payment-qr/types";

type PaymentQrRequestRow = {
  amount: number | null;
  created_at: string;
  description: string | null;
  id: string;
  payment_date: string | null;
  status: string;
  title: string;
};

type PaymentQrLookupRpcRow = {
  id: string;
  full_name: string | null;
  role: string | null;
  qr_payment_url: string | null;
};

type PaymentQrLookupEmployee = PaymentQrEmployeeOption & {
  qr_payment_url: string | null;
};

const PAYMENT_QR_REQUEST_PAGE_SIZE = 6;
const PAYMENT_QR_VISIBLE_STATUSES = [
  "pending_director",
  "director_approved",
] as const;

type PaymentQrAttachmentRow = {
  created_at: string;
  file_name: string;
  file_path: string;
  file_type: string | null;
  payment_request_id: string;
};

const normalizeRole = (value?: string | null): UserRole | null => {
  const normalizedValue =
    typeof value === "string" ? value.trim().toLowerCase() : "";

  return ROLES.includes(normalizedValue as UserRole)
    ? (normalizedValue as UserRole)
    : null;
};

const mapLookupRowToEmployee = (
  row: PaymentQrLookupRpcRow,
): PaymentQrLookupEmployee | null => {
  const role = normalizeRole(row.role);

  if (role !== "employee") {
    return null;
  }

  return {
    id: row.id,
    full_name: row.full_name,
    qr_payment_url: row.qr_payment_url,
    role,
  } satisfies PaymentQrLookupEmployee;
};

export const parsePaymentQrSearchParams = async (
  searchParams: Promise<Record<string, string | string[] | undefined>>,
) => {
  const params = await searchParams;
  const monthValue = Number(toPlainString(params.month));
  const yearValue = Number(toPlainString(params.year));
  const pageValue = Number(toPlainString(params.page));
  const hasValidYear =
    Number.isInteger(yearValue) && yearValue >= 2000 && yearValue <= 2100;

  return {
    employeeId: toPlainString(params.employee),
    month:
      hasValidYear && Number.isInteger(monthValue) && monthValue >= 1 && monthValue <= 12
        ? monthValue
        : null,
    page: Number.isInteger(pageValue) && pageValue > 0 ? pageValue : 1,
    year: hasValidYear ? yearValue : null,
  };
};

const getPaymentQrLookupEmployees = cache(
  async (): Promise<PaymentQrLookupEmployee[]> => {
    const supabase = createAdminClient() ?? (await createClient());
    const { data, error } = await supabase.rpc(
      "list_request_users_for_director",
    );

    if (error) {
      throw new Error(error.message);
    }

    const employeesById = new Map<string, PaymentQrLookupEmployee>();

    ((data ?? []) as PaymentQrLookupRpcRow[]).forEach((row) => {
      const employee = mapLookupRowToEmployee(row);

      if (!employee) {
        return;
      }

      employeesById.set(employee.id, employee);
    });

    return Array.from(employeesById.values()).sort((left, right) =>
      (left.full_name ?? "").localeCompare(right.full_name ?? "", "vi"),
    );
  },
);

export const getEmployeesForPaymentQrLookup =
  async (): Promise<PaymentQrEmployeeOption[]> =>
    (await getPaymentQrLookupEmployees()).map(
      ({ id, full_name, role }) =>
        ({
          id,
          full_name,
          role,
        }) satisfies PaymentQrEmployeeOption,
    );

export const getSelectedEmployeePaymentQr = async (
  employeeId?: string,
  filters?: {
    month?: number | null;
    page?: number;
    year?: number | null;
  },
): Promise<SelectedEmployeePaymentQr | null> => {
  if (!employeeId) {
    return null;
  }

  const employee = (await getPaymentQrLookupEmployees()).find(
    (item) => item.id === employeeId,
  );

  if (!employee) {
    return null;
  }

  const supabase = createAdminClient() ?? (await createClient());
  const [
    { data: unpaidRequests, error: unpaidRequestsError },
    qrPreviewUrl,
  ] = await Promise.all([
    supabase
      .from("payment_requests")
      .select("id, title, status, payment_date, created_at, amount, description")
      .eq("user_id", employeeId)
      .eq("is_deleted", false)
      .in("status", [...PAYMENT_QR_VISIBLE_STATUSES])
      .order("payment_date", { ascending: true })
      .order("created_at", { ascending: true }),
    getProfileQrPreviewUrl(employee.qr_payment_url),
  ]);

  if (unpaidRequestsError) {
    throw new Error(unpaidRequestsError.message);
  }

  const allUnpaidRequests = (unpaidRequests ?? []) as PaymentQrRequestRow[];
  const availableYears = Array.from(
    new Set(
      allUnpaidRequests
        .map((request) => {
          if (!request.payment_date) {
            return null;
          }

          const date = new Date(request.payment_date);
          return Number.isNaN(date.getTime()) ? null : date.getFullYear();
        })
        .filter((value): value is number => value !== null),
    ),
  ).sort((left, right) => right - left);

  const filteredUnpaidRequests = allUnpaidRequests.filter((request) => {
    if (!filters?.year) {
      return true;
    }

    if (!request.payment_date) {
      return false;
    }

    const date = new Date(request.payment_date);

    if (Number.isNaN(date.getTime()) || date.getFullYear() !== filters.year) {
      return false;
    }

    if (!filters.month) {
      return true;
    }

    return date.getMonth() + 1 === filters.month;
  });

  const totalItems = filteredUnpaidRequests.length;
  const filteredTotalAmount = filteredUnpaidRequests.reduce(
    (total, request) => total + (request.amount ?? 0),
    0,
  );
  const totalPages = Math.max(1, Math.ceil(totalItems / PAYMENT_QR_REQUEST_PAGE_SIZE));
  const currentPage = Math.min(Math.max(filters?.page ?? 1, 1), totalPages);
  const startIndex = (currentPage - 1) * PAYMENT_QR_REQUEST_PAGE_SIZE;
  const paginatedUnpaidRequests = filteredUnpaidRequests.slice(
    startIndex,
    startIndex + PAYMENT_QR_REQUEST_PAGE_SIZE,
  );

  const paginatedRequestIds = paginatedUnpaidRequests.map((request) => request.id);
  const attachmentsByRequestId = new Map<string, PaymentQrAttachmentRow>();

  if (paginatedRequestIds.length) {
    const { data: attachments, error: attachmentsError } = await supabase
      .from("payment_request_attachments")
      .select("payment_request_id, file_path, file_type, file_name, created_at")
      .in("payment_request_id", paginatedRequestIds)
      .order("created_at", { ascending: true });

    if (attachmentsError) {
      throw new Error(attachmentsError.message);
    }

    ((attachments ?? []) as PaymentQrAttachmentRow[]).forEach((attachment) => {
      if (!attachmentsByRequestId.has(attachment.payment_request_id)) {
        attachmentsByRequestId.set(attachment.payment_request_id, attachment);
      }
    });
  }

  const previewUrlEntries = await Promise.all(
    paginatedUnpaidRequests.map(async (request) => {
      const attachment = attachmentsByRequestId.get(request.id);

      if (!attachment || !attachment.file_type?.startsWith("image/")) {
        return [request.id, null] as const;
      }

      const { data } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(attachment.file_path, 60 * 60);

      return [request.id, data?.signedUrl ?? null] as const;
    }),
  );

  const previewUrlByRequestId = new Map<string, string | null>(previewUrlEntries);
  const mappedPaginatedRequests = paginatedUnpaidRequests.map((request) => {
    const attachment = attachmentsByRequestId.get(request.id);

    return {
      ...request,
      attachment_file_name: attachment?.file_name ?? null,
      attachment_file_type: attachment?.file_type ?? null,
      attachment_preview_url: previewUrlByRequestId.get(request.id) ?? null,
    } satisfies PaymentQrRecentRequest;
  });

  const unpaidTotalAmount = allUnpaidRequests.reduce(
    (total, request) => total + (request.amount ?? 0),
    0,
  );

  return {
    id: employee.id,
    full_name: employee.full_name,
    role: employee.role,
    qr_payment_url: employee.qr_payment_url,
    qr_preview_url: qrPreviewUrl,
    unpaid_request_count: allUnpaidRequests.length,
    unpaid_requests: {
      available_years: availableYears,
      items: mappedPaginatedRequests,
      month: filters?.month ?? null,
      page: currentPage,
      page_size: PAYMENT_QR_REQUEST_PAGE_SIZE,
      total_amount: filteredTotalAmount,
      total_items: totalItems,
      total_pages: totalPages,
      year: filters?.year ?? null,
    },
    unpaid_total_amount: unpaidTotalAmount,
  } satisfies SelectedEmployeePaymentQr;
};

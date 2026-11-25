"use server";

import { revalidatePath } from "next/cache";

import { privatePaymentRequestFormSchema } from "@/features/private-requests/schemas";
import {
  MAX_ATTACHMENTS,
  privateRequestFileSchema,
} from "@/features/private-requests/schemas";
import type { PrivateActionResult } from "@/features/private-requests/types";
import { APP_ROUTES, PRIVATE_FLOW_PREFIX } from "@/lib/constants";
import { requireRole } from "@/lib/auth/session";
import { createActionClient, createAdminClient } from "@/lib/supabase/server";
import { buildPrivatePaymentRequestStoragePath } from "@/lib/utils";

const PRIVATE_STORAGE_BUCKET = "private-payment-request-files";

const parseAmountValue = (value: FormDataEntryValue | null) => {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const normalized = Number(value);

  return Number.isFinite(normalized) ? normalized : value;
};

const parseOptionalStringField = (value: FormDataEntryValue | null) =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const parseFiles = (formData: FormData) =>
  formData
    .getAll("attachments")
    .filter((item): item is File => item instanceof File && item.size > 0);

const validateFiles = (files: File[]) => {
  if (!files.length) {
    throw new Error("Vui lòng tải lên ít nhất một chứng từ");
  }

  if (files.length > MAX_ATTACHMENTS) {
    throw new Error(`Chỉ được tải tối đa ${MAX_ATTACHMENTS} tệp`);
  }

  files.forEach((file) => privateRequestFileSchema.parse(file));
};

const revalidatePrivateRequestPaths = (requestId?: string) => {
  revalidatePath(PRIVATE_FLOW_PREFIX);
  revalidatePath(APP_ROUTES.privateRequests);
  revalidatePath(APP_ROUTES.privateExpenses);

  if (requestId) {
    revalidatePath(`${PRIVATE_FLOW_PREFIX}/${requestId}`);
  }
};

export const createPrivatePaymentRequestAction = async (
  formData: FormData,
): Promise<PrivateActionResult<{ id: string }>> => {
  try {
    const profile = await requireRole(["director"]);
    const files = parseFiles(formData);

    try {
      validateFiles(files);
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Tệp đính kèm không hợp lệ",
        fieldErrors: {
          attachments: [
            error instanceof Error
              ? error.message
              : "Tệp đính kèm không hợp lệ",
          ],
        },
      };
    }

    const parsed = privatePaymentRequestFormSchema.safeParse({
      title: formData.get("title"),
      amount: parseAmountValue(formData.get("amount")),
      description: formData.get("description"),
      payment_date: parseOptionalStringField(formData.get("payment_date")),
      sub_category_id:
        typeof formData.get("sub_category_id") === "string"
          ? String(formData.get("sub_category_id")).trim()
          : "",
    });

    if (!parsed.success) {
      return {
        success: false,
        error: "Dữ liệu biểu mẫu không hợp lệ",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const supabase = await createActionClient();
    const { data: createdRequest, error: createError } = await supabase
      .from("private_payment_requests")
      .insert({
        user_id: profile.id,
        title: parsed.data.title,
        amount: parsed.data.amount ?? null,
        description: parsed.data.description || null,
        payment_date: parsed.data.payment_date ?? null,
        sub_category_id: parsed.data.sub_category_id,
        is_deleted: false,
      })
      .select("id")
      .single();

    if (createError || !createdRequest) {
      throw new Error(createError?.message ?? "Không thể tạo DNTT riêng");
    }

    const uploadedPaths: string[] = [];

    try {
      const attachmentRows = [];

      for (const [index, file] of files.entries()) {
        const filePath = buildPrivatePaymentRequestStoragePath({
          userId: profile.id,
          requestId: createdRequest.id,
          timestamp: Date.now() + index,
          fileName: file.name,
        });

        const { error: uploadError } = await supabase.storage
          .from(PRIVATE_STORAGE_BUCKET)
          .upload(filePath, file, {
            cacheControl: "3600",
            contentType: file.type || undefined,
            upsert: false,
          });

        if (uploadError) {
          throw new Error(uploadError.message);
        }

        uploadedPaths.push(filePath);
        attachmentRows.push({
          private_payment_request_id: createdRequest.id,
          created_by: profile.id,
          file_path: filePath,
          file_name: file.name,
          file_type: file.type || null,
        });
      }

      const { error: attachmentError } = await supabase
        .from("private_payment_request_attachments")
        .insert(attachmentRows);

      if (attachmentError) {
        throw new Error(attachmentError.message);
      }

      const { error: logError } = await supabase
        .from("private_payment_request_logs")
        .insert({
          private_payment_request_id: createdRequest.id,
          actor_id: profile.id,
          action: "created",
          meta: {
            attachment_count: files.length,
          },
        });

      if (logError) {
        throw new Error(logError.message);
      }
    } catch (error) {
      if (uploadedPaths.length) {
        await supabase.storage
          .from(PRIVATE_STORAGE_BUCKET)
          .remove(uploadedPaths);
      }

      const cleanupClient = createAdminClient() ?? supabase;
      await cleanupClient
        .from("private_payment_requests")
        .delete()
        .eq("id", createdRequest.id);
      throw error;
    }

    revalidatePrivateRequestPaths(createdRequest.id);

    return {
      success: true,
      data: { id: createdRequest.id },
      message: "Đã tạo DNTT riêng",
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Không thể tạo DNTT riêng",
    };
  }
};

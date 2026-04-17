'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import {
  APP_ROUTES,
  DEFAULT_REQUEST_STATUS,
  NOTIFICATION_LABELS,
  STORAGE_BUCKET,
  type NotificationType,
  type PaymentRequestLogAction,
  type PaymentRequestStatus,
} from '@/lib/constants';
import { requireRole } from '@/lib/auth/session';
import {
  canMarkAsPaid,
  canManageOwnRequest,
  canReviewAccounting,
  canSoftDeleteOwnRequest,
} from '@/lib/auth/permissions';
import {
  MAX_ATTACHMENTS,
  MAX_FILE_SIZE_BYTES,
  MAX_PAYMENT_BILLS,
  confirmPaymentSchema,
  paymentRequestFormSchema,
  paymentBillImageSchema,
  paymentRequestQrImageSchema,
  reviewSchema,
} from '@/features/payment-requests/schemas';
import { uploadPaymentBillFiles } from '@/features/payment-requests/payment-bill-storage';
import { uploadPaymentRequestQrFile } from '@/features/payment-requests/payment-request-qr-storage';
import { createActionClient, createAdminClient } from '@/lib/supabase/server';
import { buildStoragePath } from '@/lib/utils';
import type { Database } from '@/types/database';
import type { ActionResult } from '@/features/payment-requests/types';

type MutationClient =
  | Awaited<ReturnType<typeof createActionClient>>
  | NonNullable<ReturnType<typeof createAdminClient>>;

const fileSchema = z
  .instanceof(File)
  .refine((file) => file.size > 0, 'Tệp đính kèm không hợp lệ')
  .refine(
    (file) => file.size <= MAX_FILE_SIZE_BYTES,
    'Mỗi tệp không được vượt quá 10MB',
  )
  .refine(
    (file) =>
      file.type === 'application/pdf' ||
      file.type.startsWith('image/') ||
      !file.type,
    'Chỉ hỗ trợ ảnh hoặc PDF',
  );

const parseFiles = (formData: FormData) =>
  formData
    .getAll('attachments')
    .filter((item): item is File => item instanceof File && item.size > 0);

const parsePaymentBillFiles = (formData: FormData) =>
  formData
    .getAll('payment_bills')
    .filter((item): item is File => item instanceof File && item.size > 0);

const parseOptionalSingleFile = (entry: FormDataEntryValue | null) =>
  entry instanceof File && entry.size > 0 ? entry : null;

const parseRemoveAttachmentIds = (formData: FormData) =>
  formData
    .getAll('removeAttachmentIds')
    .filter((item): item is string => typeof item === 'string');

const parseBoolean = (value: FormDataEntryValue | null) =>
  typeof value === 'string' &&
  ['true', '1', 'on', 'yes'].includes(value.trim().toLowerCase());

const parseAmountValue = (value: FormDataEntryValue | null) => {
  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }

  const normalized = Number(value);

  return Number.isFinite(normalized) ? normalized : value;
};

const revalidateRequestPaths = (requestId: string) => {
  revalidatePath(APP_ROUTES.dashboard);
  revalidatePath(APP_ROUTES.myRequests);
  revalidatePath(APP_ROUTES.requests);
  revalidatePath(APP_ROUTES.paymentQr);
  revalidatePath(APP_ROUTES.notifications);
  revalidatePath(`${APP_ROUTES.myRequests}/${requestId}`);
  revalidatePath(`${APP_ROUTES.requests}/${requestId}`);
};

const insertLog = async ({
  client,
  requestId,
  actorId,
  action,
  meta,
}: {
  client?: MutationClient;
  requestId: string;
  actorId: string;
  action: PaymentRequestLogAction;
  meta?: Database['public']['Tables']['payment_request_logs']['Insert']['meta'];
}) => {
  const insertDirectly = async (supabase: MutationClient) => {
    const { error } = await supabase.from('payment_request_logs').insert({
      payment_request_id: requestId,
      actor_id: actorId,
      action,
      meta: meta ?? null,
    });

    if (error) {
      throw new Error(error.message);
    }
  };

  if (!client) {
    const adminClient = createAdminClient();

    if (adminClient) {
      await insertDirectly(adminClient);
      return;
    }
  }

  const supabase = client ?? (await createActionClient());
  const { error } = await supabase.rpc('insert_payment_request_log', {
    target_action: action,
    target_actor_id: actorId,
    target_meta: meta ?? null,
    target_request_id: requestId,
  });

  if (!error) {
    return;
  }

  const isMissingRpcFunction = error.message.includes(
    'insert_payment_request_log',
  );

  if (!isMissingRpcFunction) {
    throw new Error(error.message);
  }

  await insertDirectly(supabase);
};

const notifyUsers = async ({
  client,
  recipientIds,
  type,
  title,
  body,
  requestId,
}: {
  client?: MutationClient;
  recipientIds: string[];
  type: NotificationType;
  title: string;
  body: string;
  requestId: string;
}) => {
  if (!recipientIds.length) {
    return;
  }

  const supabase =
    client ?? createAdminClient() ?? (await createActionClient());
  const { error } = await supabase.from('notifications').insert(
    recipientIds.map((userId) => ({
      user_id: userId,
      type,
      title,
      body,
      entity_type: 'payment_request',
      entity_id: requestId,
      is_read: false,
    })),
  );

  if (error) {
    console.error('Notification insert failed', error.message);
  }
};

const getProfilesByRole = async (role: 'accountant' | 'director') => {
  const client = createAdminClient() ?? (await createActionClient());
  const { data, error } = await client
    .from('profiles')
    .select('id')
    .eq('role', role);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((item) => item.id);
};

const uploadNewAttachments = async ({
  requestId,
  userId,
  files,
}: {
  requestId: string;
  userId: string;
  files: File[];
}) => {
  const supabase = await createActionClient();
  const uploadedPaths: string[] = [];
  const attachmentRows: Database['public']['Tables']['payment_request_attachments']['Insert'][] =
    [];

  for (const file of files) {
    const filePath = buildStoragePath({
      userId,
      requestId,
      timestamp: Date.now(),
      fileName: file.name,
    });

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        contentType: file.type || undefined,
        upsert: false,
      });

    if (uploadError) {
      if (uploadedPaths.length) {
        await supabase.storage.from(STORAGE_BUCKET).remove(uploadedPaths);
      }

      throw new Error(uploadError.message);
    }

    uploadedPaths.push(filePath);
    attachmentRows.push({
      payment_request_id: requestId,
      file_path: filePath,
      file_name: file.name,
      file_type: file.type || null,
      created_by: userId,
    });
  }

  if (attachmentRows.length) {
    const { error } = await supabase
      .from('payment_request_attachments')
      .insert(attachmentRows);

    if (error) {
      await supabase.storage.from(STORAGE_BUCKET).remove(uploadedPaths);
      throw new Error(error.message);
    }
  }
};

const validateFiles = (files: File[], existingCount = 0) => {
  if (files.length + existingCount > MAX_ATTACHMENTS) {
    throw new Error(`Chỉ được tải tối đa ${MAX_ATTACHMENTS} tệp`);
  }

  files.forEach((file) => {
    fileSchema.parse(file);
  });
};

const validatePaymentBillFiles = (files: File[], existingCount = 0) => {
  if (!files.length) {
    throw new Error('Vui lòng tải lên bill thanh toán');
  }

  if (files.length + existingCount > MAX_PAYMENT_BILLS) {
    throw new Error(`Chỉ được tải tối đa ${MAX_PAYMENT_BILLS} bill thanh toán`);
  }

  files.forEach((file) => {
    paymentBillImageSchema.parse(file);
  });
};

const getRequestForMutation = async (requestId: string) => {
  const supabase = await createActionClient();
  const { data, error } = await supabase
    .from('payment_requests')
    .select('*')
    .eq('id', requestId)
    .single();

  if (error || !data) {
    throw new Error('Không tìm thấy đề nghị thanh toán');
  }

  return data;
};

const clearReviewFields = {
  accounting_note: null,
  accounting_confirmed_by: null,
  accounting_confirmed_at: null,
  director_note: null,
  director_approved_by: null,
  director_approved_at: null,
};

export const createPaymentRequestAction = async (
  formData: FormData,
): Promise<ActionResult<{ id: string }>> => {
  try {
    const profile = await requireRole(['employee', 'accountant']);
    const supabase = await createActionClient();
    const files = parseFiles(formData);
    const paymentQrFile = parseOptionalSingleFile(formData.get('payment_qr'));

    if (!files.length) {
      return {
        success: false,
        error: 'Vui lòng tải lên ít nhất một chứng từ',
      };
    }

    validateFiles(files);

    if (paymentQrFile) {
      const parsedPaymentQr =
        paymentRequestQrImageSchema.safeParse(paymentQrFile);

      if (!parsedPaymentQr.success) {
        const message =
          parsedPaymentQr.error.issues[0]?.message ??
          'Ảnh QR thanh toán không hợp lệ';

        return {
          success: false,
          error: message,
          fieldErrors: {
            payment_qr: [message],
          },
        };
      }
    }

    const parsed = paymentRequestFormSchema.safeParse({
      title: formData.get('title'),
      amount: parseAmountValue(formData.get('amount')),
      description: formData.get('description'),
      payment_date: formData.get('payment_date'),
    });

    if (!parsed.success) {
      return {
        success: false,
        error: 'Dữ liệu biểu mẫu không hợp lệ',
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const { data: createdRequest, error } = await supabase
      .from('payment_requests')
      .insert({
        user_id: profile.id,
        title: parsed.data.title,
        amount: parsed.data.amount ?? null,
        description: parsed.data.description || null,
        payment_date: parsed.data.payment_date,
        status: DEFAULT_REQUEST_STATUS,
        is_deleted: false,
      })
      .select('id')
      .single();

    if (error || !createdRequest) {
      throw new Error(error?.message ?? 'Không thể tạo đề nghị');
    }

    try {
      await uploadNewAttachments({
        requestId: createdRequest.id,
        userId: profile.id,
        files,
      });

      if (paymentQrFile) {
        const uploadedPaymentQr = await uploadPaymentRequestQrFile({
          file: paymentQrFile,
          requestId: createdRequest.id,
        });
        const { error: updatePaymentQrError } = await supabase
          .from('payment_requests')
          .update({
            payment_qr_path: uploadedPaymentQr.path,
            payment_qr_name: uploadedPaymentQr.fileName,
            payment_qr_type: uploadedPaymentQr.fileType,
            updated_at: new Date().toISOString(),
          })
          .eq('id', createdRequest.id);

        if (updatePaymentQrError) {
          await supabase.storage
            .from(STORAGE_BUCKET)
            .remove([uploadedPaymentQr.path]);
          throw new Error(updatePaymentQrError.message);
        }
      }
    } catch (attachmentError) {
      await supabase
        .from('payment_requests')
        .delete()
        .eq('id', createdRequest.id);
      throw attachmentError;
    }

    await insertLog({
      client: supabase,
      requestId: createdRequest.id,
      actorId: profile.id,
      action: 'created',
    });

    const accountants = await getProfilesByRole('accountant');
    await notifyUsers({
      client: supabase,
      recipientIds: accountants,
      type: 'request_created',
      title: NOTIFICATION_LABELS.request_created,
      body: `${profile.full_name ?? 'Nhân viên'} vừa tạo một đề nghị thanh toán mới.`,
      requestId: createdRequest.id,
    });

    revalidateRequestPaths(createdRequest.id);

    return {
      success: true,
      data: { id: createdRequest.id },
      message: 'Đã tạo đề nghị thanh toán',
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Không thể tạo đề nghị thanh toán',
    };
  }
};

export const updatePaymentRequestAction = async (
  requestId: string,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> => {
  try {
    const profile = await requireRole(['employee', 'accountant']);
    const request = await getRequestForMutation(requestId);

    if (request.user_id !== profile.id) {
      return {
        success: false,
        error: 'Bạn không có quyền cập nhật đề nghị này',
      };
    }

    if (
      !canManageOwnRequest(
        profile.role,
        request.status as PaymentRequestStatus,
      ) ||
      request.is_deleted
    ) {
      return {
        success: false,
        error: 'Trạng thái hiện tại không cho phép chỉnh sửa',
      };
    }

    const parsed = paymentRequestFormSchema.safeParse({
      title: formData.get('title'),
      amount: parseAmountValue(formData.get('amount')),
      description: formData.get('description'),
      payment_date: formData.get('payment_date'),
    });

    if (!parsed.success) {
      return {
        success: false,
        error: 'Dữ liệu biểu mẫu không hợp lệ',
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const removeAttachmentIds = parseRemoveAttachmentIds(formData);
    const files = parseFiles(formData);
    const removePaymentQr = parseBoolean(formData.get('removePaymentQr'));
    const paymentQrFile = parseOptionalSingleFile(formData.get('payment_qr'));
    const supabase = await createActionClient();

    if (paymentQrFile) {
      const parsedPaymentQr =
        paymentRequestQrImageSchema.safeParse(paymentQrFile);

      if (!parsedPaymentQr.success) {
        const message =
          parsedPaymentQr.error.issues[0]?.message ??
          'Ảnh QR thanh toán không hợp lệ';

        return {
          success: false,
          error: message,
          fieldErrors: {
            payment_qr: [message],
          },
        };
      }
    }

    const { data: existingAttachments, error: attachmentError } = await supabase
      .from('payment_request_attachments')
      .select('*')
      .eq('payment_request_id', requestId);

    if (attachmentError) {
      throw new Error(attachmentError.message);
    }

    const removableAttachments = (existingAttachments ?? []).filter(
      (attachment) => removeAttachmentIds.includes(attachment.id),
    );
    const remainingAttachmentCount =
      (existingAttachments?.length ?? 0) - removableAttachments.length;

    if (!files.length && remainingAttachmentCount <= 0) {
      return {
        success: false,
        error: 'Đề nghị phải có ít nhất một chứng từ',
      };
    }

    validateFiles(files, remainingAttachmentCount);

    const nextStatus: PaymentRequestStatus =
      request.status === 'accounting_rejected' ||
      request.status === 'director_rejected'
        ? 'pending_accounting'
        : (request.status as PaymentRequestStatus);

    const { error: updateError } = await supabase
      .from('payment_requests')
      .update({
        title: parsed.data.title,
        amount: parsed.data.amount ?? null,
        description: parsed.data.description || null,
        payment_date: parsed.data.payment_date,
        status: nextStatus,
        updated_at: new Date().toISOString(),
        ...(nextStatus === 'pending_accounting' ? clearReviewFields : {}),
      })
      .eq('id', requestId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    if (removableAttachments.length) {
      const { error: storageDeleteError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove(removableAttachments.map((item) => item.file_path));

      if (storageDeleteError) {
        throw new Error(storageDeleteError.message);
      }

      const { error: attachmentDeleteError } = await supabase
        .from('payment_request_attachments')
        .delete()
        .in(
          'id',
          removableAttachments.map((item) => item.id),
        );

      if (attachmentDeleteError) {
        throw new Error(attachmentDeleteError.message);
      }
    }

    if (files.length) {
      await uploadNewAttachments({
        requestId,
        userId: profile.id,
        files,
      });
    }

    const currentPaymentQrPath = request.payment_qr_path;

    if (paymentQrFile) {
      const uploadedPaymentQr = await uploadPaymentRequestQrFile({
        file: paymentQrFile,
        requestId,
      });

      const { error: updatePaymentQrError } = await supabase
        .from('payment_requests')
        .update({
          payment_qr_path: uploadedPaymentQr.path,
          payment_qr_name: uploadedPaymentQr.fileName,
          payment_qr_type: uploadedPaymentQr.fileType,
          updated_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (updatePaymentQrError) {
        await supabase.storage
          .from(STORAGE_BUCKET)
          .remove([uploadedPaymentQr.path]);
        throw new Error(updatePaymentQrError.message);
      }

      if (currentPaymentQrPath) {
        const { error: removeOldQrError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .remove([currentPaymentQrPath]);

        if (removeOldQrError) {
          console.error(
            'Failed to remove old payment QR',
            removeOldQrError.message,
          );
        }
      }
    } else if (removePaymentQr && currentPaymentQrPath) {
      const { error: clearPaymentQrError } = await supabase
        .from('payment_requests')
        .update({
          payment_qr_path: null,
          payment_qr_name: null,
          payment_qr_type: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (clearPaymentQrError) {
        throw new Error(clearPaymentQrError.message);
      }

      const { error: removeQrError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove([currentPaymentQrPath]);

      if (removeQrError) {
        console.error('Failed to remove payment QR', removeQrError.message);
      }
    }

    await insertLog({
      client: supabase,
      requestId,
      actorId: profile.id,
      action: 'updated',
      meta: {
        status: nextStatus,
        removed_attachment_ids: removeAttachmentIds,
        removed_payment_qr: removePaymentQr && !paymentQrFile,
      },
    });

    if (request.status !== nextStatus && nextStatus === 'pending_accounting') {
      const accountants = await getProfilesByRole('accountant');
      await notifyUsers({
        client: supabase,
        recipientIds: accountants,
        type: 'request_created',
        title: NOTIFICATION_LABELS.request_created,
        body: `${profile.full_name ?? 'Nhân viên'} vừa cập nhật và gửi lại một đề nghị thanh toán.`,
        requestId,
      });
    }

    revalidateRequestPaths(requestId);

    return {
      success: true,
      data: { id: requestId },
      message: 'Đã cập nhật đề nghị thanh toán',
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Không thể cập nhật đề nghị',
    };
  }
};

export const softDeletePaymentRequestAction = async (
  requestId: string,
): Promise<ActionResult> => {
  try {
    const profile = await requireRole(['employee', 'accountant']);
    const request = await getRequestForMutation(requestId);

    if (request.user_id !== profile.id) {
      return {
        success: false,
        error: 'Bạn không có quyền xóa đề nghị này',
      };
    }

    if (
      !canSoftDeleteOwnRequest(
        profile.role,
        request.status as PaymentRequestStatus,
      )
    ) {
      return {
        success: false,
        error: 'Không thể xóa đề nghị ở trạng thái hiện tại',
      };
    }

    const supabase = await createActionClient();
    const now = new Date().toISOString();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    console.log('soft delete auth', {
      profileId: profile.id,
      authUserId: user?.id,
      authError: authError?.message,
      requestUserId: request.user_id,
      requestStatus: request.status,
    });

    const { error } = await supabase
      .from('payment_requests')
      .update({
        is_deleted: true,
        deleted_at: now,
        updated_at: now,
      })
      .eq('id', requestId)
      .eq('user_id', profile.id)
      .in('status', [
        'pending_accounting',
        'accounting_rejected',
        'director_rejected',
      ])
      .is('is_deleted', false);

    if (error) {
      throw new Error(error.message);
    }

    try {
      await insertLog({
        client: supabase,
        requestId,
        actorId: profile.id,
        action: 'soft_deleted',
      });
    } catch (logError) {
      // Do not fail the delete flow when audit log insertion is blocked by RLS.
      console.error('Failed to insert soft-delete log', logError);
    }

    revalidateRequestPaths(requestId);

    return {
      success: true,
      message: 'Đã xóa đề nghị',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Không thể xóa đề nghị',
    };
  }
};

export const reviewPaymentRequestAction = async ({
  requestId,
  decision,
  note,
}: {
  requestId: string;
  decision: 'approve' | 'reject';
  note?: string;
}): Promise<ActionResult> => {
  try {
    const profile = await requireRole(['accountant']);
    const parsed = reviewSchema.safeParse({
      decision,
      note: note ?? '',
    });

    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ',
      };
    }

    const request = await getRequestForMutation(requestId);
    const supabase = await createActionClient();

    if (
      !canReviewAccounting(profile.role, request.status as PaymentRequestStatus)
    ) {
      return {
        success: false,
        error: 'Đề nghị này không còn ở bước duyệt của kế toán',
      };
    }

    const nextStatus: PaymentRequestStatus =
      parsed.data.decision === 'approve'
        ? 'director_approved'
        : 'accounting_rejected';
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('payment_requests')
      .update({
        status: nextStatus,
        accounting_note: parsed.data.note || null,
        accounting_confirmed_by: profile.id,
        accounting_confirmed_at: now,
        director_note: null,
        director_approved_by: null,
        director_approved_at: null,
        updated_at: now,
      })
      .eq('id', requestId);

    if (error) {
      throw new Error(error.message);
    }

    await insertLog({
      client: supabase,
      requestId,
      actorId: profile.id,
      action:
        nextStatus === 'director_approved'
          ? 'accounting_approved'
          : 'accounting_rejected',
      meta: {
        note: parsed.data.note || null,
      },
    });

    if (nextStatus === 'director_approved') {
      const directors = await getProfilesByRole('director');
      await notifyUsers({
        client: supabase,
        recipientIds: Array.from(new Set([request.user_id, ...directors])),
        type: 'accounting_approved',
        title: NOTIFICATION_LABELS.accounting_approved,
        body: `${profile.full_name ?? 'Kế toán'} đã duyệt một đề nghị thanh toán và sẵn sàng cho bước chi trả.`,
        requestId,
      });
    } else {
      await notifyUsers({
        client: supabase,
        recipientIds: [request.user_id],
        type: 'accounting_rejected',
        title: NOTIFICATION_LABELS.accounting_rejected,
        body: `${profile.full_name ?? 'Kế toán'} đã từ chối đề nghị thanh toán của bạn.`,
        requestId,
      });
    }

    revalidateRequestPaths(requestId);

    return {
      success: true,
      message:
        nextStatus === 'director_approved'
          ? 'Đã duyệt đề nghị'
          : 'Đã từ chối đề nghị',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Không thể xử lý đề nghị',
    };
  }
};

const bulkApproveAccountingRequestsSchema = z
  .array(z.string().uuid('Mã đề nghị không hợp lệ'))
  .min(1, 'Vui lòng chọn ít nhất một đề nghị');

export const confirmPaymentRequestPaidAction = async (
  formData: FormData,
): Promise<ActionResult<{ paymentReference: string; requestId: string }>> => {
  try {
    const profile = await requireRole(['director']);
    const parsed = confirmPaymentSchema.safeParse({
      requestId: formData.get('requestId'),
      payment_reference: formData.get('payment_reference'),
    });

    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ',
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const paymentBillFiles = parsePaymentBillFiles(formData);

    const request = await getRequestForMutation(parsed.data.requestId);

    if (
      request.is_deleted ||
      !canMarkAsPaid(profile.role, request.status as PaymentRequestStatus)
    ) {
      return {
        success: false,
        error: 'Đề nghị này chưa sẵn sàng để xác nhận thanh toán',
      };
    }

    const supabase = await createActionClient();
    const { data: existingPaymentBills, error: existingPaymentBillsError } =
      await supabase
        .from('payment_request_payment_bills')
        .select('id, file_path')
        .eq('payment_request_id', request.id);

    if (existingPaymentBillsError) {
      throw new Error(existingPaymentBillsError.message);
    }

    try {
      validatePaymentBillFiles(
        paymentBillFiles,
        existingPaymentBills?.length ?? 0,
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Ảnh bill thanh toán không hợp lệ';

      return {
        success: false,
        error: message,
        fieldErrors: {
          payment_bills: [message],
        },
      };
    }

    const uploadedBills = await uploadPaymentBillFiles({
      files: paymentBillFiles,
      requestId: request.id,
    });
    const now = new Date().toISOString();
    const insertedBillRows = uploadedBills.map((bill) => ({
      payment_request_id: request.id,
      file_path: bill.path,
      file_name: bill.fileName,
      file_type: bill.fileType,
      created_by: profile.id,
    }));
    const { data: insertedPaymentBills, error: insertPaymentBillsError } =
      await supabase
        .from('payment_request_payment_bills')
        .insert(insertedBillRows)
        .select('id');

    if (insertPaymentBillsError) {
      await supabase
        .storage
        .from(STORAGE_BUCKET)
        .remove(uploadedBills.map((bill) => bill.path));
      throw new Error(insertPaymentBillsError.message);
    }

    const { error } = await supabase
      .from('payment_requests')
      .update({
        paid_at: now,
        paid_by: profile.id,
        payment_reference: parsed.data.payment_reference,
        status: 'paid',
        updated_at: now,
      })
      .eq('id', request.id);

    if (error) {
      if (insertedPaymentBills?.length) {
        await supabase
          .from('payment_request_payment_bills')
          .delete()
          .in(
            'id',
            insertedPaymentBills.map((bill) => bill.id),
          );
      }

      await supabase
        .storage
        .from(STORAGE_BUCKET)
        .remove(uploadedBills.map((bill) => bill.path));
      throw new Error(error.message);
    }

    await insertLog({
      client: supabase,
      requestId: request.id,
      actorId: profile.id,
      action: 'marked_paid',
      meta: {
        payment_bill_count: uploadedBills.length,
        payment_bill_names: uploadedBills.map((bill) => bill.fileName),
        payment_reference: parsed.data.payment_reference,
      },
    });

    await notifyUsers({
      client: supabase,
      recipientIds: [request.user_id],
      type: 'marked_paid',
      title: NOTIFICATION_LABELS.marked_paid,
      body: `${profile.full_name ?? 'Giám đốc'} đã xác nhận thanh toán cho đề nghị của bạn với mã ${parsed.data.payment_reference}.`,
      requestId: request.id,
    });

    revalidateRequestPaths(request.id);

    return {
      success: true,
      data: {
        paymentReference: parsed.data.payment_reference,
        requestId: request.id,
      },
      message: 'Đã xác nhận thanh toán',
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Không thể xác nhận thanh toán',
    };
  }
};

export const bulkApproveAccountingRequestsAction = async (
  requestIds: string[],
): Promise<ActionResult<{ count: number }>> => {
  try {
    const profile = await requireRole(['accountant']);
    const parsed = bulkApproveAccountingRequestsSchema.safeParse(requestIds);

    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ',
      };
    }

    const supabase = await createActionClient();
    const { data: requests, error } = await supabase
      .from('payment_requests')
      .select('*')
      .in('id', parsed.data);

    if (error) {
      throw new Error(error.message);
    }

    if ((requests?.length ?? 0) !== parsed.data.length) {
      return {
        success: false,
        error: 'Một hoặc nhiều đề nghị không còn khả dụng',
      };
    }

    const invalidRequest = (requests ?? []).find(
      (request) =>
        request.is_deleted ||
        !canReviewAccounting(
          profile.role,
          request.status as PaymentRequestStatus,
        ),
    );

    if (invalidRequest) {
      return {
        success: false,
        error:
          'Chỉ có thể bulk duyệt khi tất cả đề nghị đang ở bước chờ kế toán',
      };
    }

    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('payment_requests')
      .update({
        status: 'director_approved',
        accounting_note: null,
        accounting_confirmed_by: profile.id,
        accounting_confirmed_at: now,
        director_note: null,
        director_approved_by: null,
        director_approved_at: null,
        updated_at: now,
      })
      .in('id', parsed.data);

    if (updateError) {
      throw new Error(updateError.message);
    }

    const directors = await getProfilesByRole('director');

    await Promise.all(
      (requests ?? []).map(async (request) => {
        await insertLog({
          client: supabase,
          requestId: request.id,
          actorId: profile.id,
          action: 'accounting_approved',
          meta: {
            note: null,
          },
        });

        await notifyUsers({
          client: supabase,
          recipientIds: Array.from(new Set([request.user_id, ...directors])),
          type: 'accounting_approved',
          title: NOTIFICATION_LABELS.accounting_approved,
          body: `${profile.full_name ?? 'Kế toán'} đã duyệt một đề nghị thanh toán và sẵn sàng cho bước chi trả.`,
          requestId: request.id,
        });

        revalidateRequestPaths(request.id);
      }),
    );

    return {
      success: true,
      data: { count: parsed.data.length },
      message:
        parsed.data.length === 1
          ? 'Đã duyệt đề nghị'
          : `Đã duyệt ${parsed.data.length} đề nghị`,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Không thể bulk duyệt đề nghị',
    };
  }
};

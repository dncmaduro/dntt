"use server";

import { revalidatePath } from "next/cache";

import type { ActionResult } from "@/features/payment-requests/types";
import {
  profileDetailsSchema,
  profileQrImageSchema,
} from "@/features/profile/schema";
import { APP_ROUTES, STORAGE_BUCKET } from "@/lib/constants";
import { requireAuth } from "@/lib/auth/session";
import { createActionClient } from "@/lib/supabase/server";
import { buildProfileQrStoragePath } from "@/lib/utils";

export const updateProfileAction = async (
  formData: FormData,
): Promise<ActionResult> => {
  try {
    const profile = await requireAuth();
    const parsed = profileDetailsSchema.safeParse({
      full_name: formData.get("full_name"),
    });

    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const qrImageEntry = formData.get("qr_image");
    const qrImageFile =
      qrImageEntry instanceof File && qrImageEntry.size > 0 ? qrImageEntry : null;

    if (qrImageFile) {
      const parsedQrImage = profileQrImageSchema.safeParse(qrImageFile);

      if (!parsedQrImage.success) {
        const message =
          parsedQrImage.error.issues[0]?.message ?? "Ảnh QR không hợp lệ";

        return {
          success: false,
          error: message,
          fieldErrors: {
            qr_image: [message],
          },
        };
      }
    }

    const supabase = await createActionClient();
    let uploadedQrPath: string | null = null;
    let nextQrPaymentUrl = profile.qr_payment_url ?? null;

    if (qrImageFile) {
      uploadedQrPath = buildProfileQrStoragePath({
        userId: profile.id,
        timestamp: Date.now(),
        fileName: qrImageFile.name,
        fileType: qrImageFile.type,
      });

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(uploadedQrPath, qrImageFile, {
          cacheControl: "3600",
          contentType: qrImageFile.type || undefined,
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Không thể tải ảnh QR lên: ${uploadError.message}`);
      }

      nextQrPaymentUrl = uploadedQrPath;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: parsed.data.full_name,
        qr_payment_url: nextQrPaymentUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", profile.id);

    if (error) {
      if (uploadedQrPath) {
        await supabase.storage.from(STORAGE_BUCKET).remove([uploadedQrPath]);
      }

      throw new Error(error.message);
    }

    revalidatePath(APP_ROUTES.profile);
    revalidatePath(APP_ROUTES.dashboard);

    return {
      success: true,
      message: "Đã cập nhật hồ sơ cá nhân",
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Không thể cập nhật hồ sơ",
    };
  }
};

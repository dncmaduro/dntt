import { STORAGE_BUCKET } from "@/lib/constants";
import { createActionClient, createAdminClient, createClient } from "@/lib/supabase/server";
import { buildPaymentBillStoragePath } from "@/lib/utils";

export type UploadedPaymentBill = {
  fileName: string;
  fileType: string | null;
  path: string;
};

const isExternalUrl = (value: string) => /^https?:\/\//i.test(value);

export const uploadPaymentBillFile = async ({
  file,
  requestId,
}: {
  file: File;
  requestId: string;
}): Promise<UploadedPaymentBill> => {
  const supabase = await createActionClient();
  const path = buildPaymentBillStoragePath({
    requestId,
    timestamp: Date.now(),
    fileName: file.name,
  });

  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, {
    cacheControl: "3600",
    contentType: file.type || undefined,
    upsert: false,
  });

  if (error) {
    throw new Error(`Không thể tải bill thanh toán lên: ${error.message}`);
  }

  return {
    fileName: file.name,
    fileType: file.type || null,
    path,
  };
};

export const getPaymentBillPreviewUrl = async (path?: string | null) => {
  if (!path) {
    return null;
  }

  if (isExternalUrl(path)) {
    return path;
  }

  const supabase = createAdminClient() ?? (await createClient());
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(path, 60 * 60);

  if (error) {
    console.error("Payment bill signed URL failed", error.message);
    return null;
  }

  return data.signedUrl;
};

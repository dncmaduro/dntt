import { STORAGE_BUCKET } from "@/lib/constants";
import { createActionClient, createAdminClient, createClient } from "@/lib/supabase/server";
import { buildPaymentBillStoragePath } from "@/lib/utils";

export type UploadedPaymentBill = {
  fileName: string;
  fileType: string | null;
  path: string;
};

const isExternalUrl = (value: string) => /^https?:\/\//i.test(value);

export const uploadPaymentBillFiles = async ({
  files,
  requestId,
}: {
  files: File[];
  requestId: string;
}): Promise<UploadedPaymentBill[]> => {
  const supabase = await createActionClient();
  const uploadedPaths: string[] = [];
  const uploadedBills: UploadedPaymentBill[] = [];

  for (const file of files) {
    const path = buildPaymentBillStoragePath({
      requestId,
      timestamp: Date.now(),
      fileName: file.name,
    });

    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, file, {
        cacheControl: "3600",
        contentType: file.type || undefined,
        upsert: false,
      });

    if (error) {
      if (uploadedPaths.length) {
        await supabase.storage.from(STORAGE_BUCKET).remove(uploadedPaths);
      }

      throw new Error(`Không thể tải bill thanh toán lên: ${error.message}`);
    }

    uploadedPaths.push(path);
    uploadedBills.push({
      fileName: file.name,
      fileType: file.type || null,
      path,
    });
  }

  return uploadedBills;
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

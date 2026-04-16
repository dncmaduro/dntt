import { STORAGE_BUCKET } from "@/lib/constants";
import { createAdminClient, createClient } from "@/lib/supabase/server";

const isExternalUrl = (value: string) => /^https?:\/\//i.test(value);

export const getProfileQrPreviewUrl = async (qrPaymentUrl?: string | null) => {
  if (!qrPaymentUrl) {
    return null;
  }

  if (isExternalUrl(qrPaymentUrl)) {
    return qrPaymentUrl;
  }

  const supabase = createAdminClient() ?? (await createClient());
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(qrPaymentUrl, 60 * 60);

  if (error) {
    console.error("Profile QR signed URL failed", error.message);
    return null;
  }

  return data.signedUrl;
};

export const getProfileQrPreviewUrlByUserId = async (userId?: string | null) => {
  if (!userId) {
    return null;
  }

  const supabase = createAdminClient() ?? (await createClient());
  const { data, error } = await supabase
    .from("profiles")
    .select("qr_payment_url")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("Profile QR fetch by user id failed", error.message);
    return null;
  }

  return getProfileQrPreviewUrl(data?.qr_payment_url ?? null);
};

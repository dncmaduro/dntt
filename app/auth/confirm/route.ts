import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

import { APP_ROUTES } from "@/lib/constants";
import { createActionClient } from "@/lib/supabase/server";

const OTP_TYPES: EmailOtpType[] = [
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
];

const isEmailOtpType = (value: string): value is EmailOtpType =>
  OTP_TYPES.includes(value as EmailOtpType);

const resolveSafeNextPath = (value: string | null, fallback: string) => {
  if (!value || !value.startsWith("/")) {
    return fallback;
  }

  return value;
};

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");
  const nextPath = resolveSafeNextPath(
    requestUrl.searchParams.get("next"),
    APP_ROUTES.resetPassword,
  );
  const nextUrl = new URL(nextPath, requestUrl.origin);
  const supabase = await createActionClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(nextUrl);
    }
  }

  if (tokenHash && type && isEmailOtpType(type)) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });

    if (!error) {
      return NextResponse.redirect(nextUrl);
    }
  }

  const fallbackUrl = new URL(APP_ROUTES.forgotPassword, requestUrl.origin);
  fallbackUrl.searchParams.set("error", "invalid_recovery_link");
  return NextResponse.redirect(fallbackUrl);
}

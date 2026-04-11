"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { APP_ROUTES } from "@/lib/constants";
import { createActionClient } from "@/lib/supabase/server";

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập email")
    .email("Email không hợp lệ"),
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
  redirectTo: z.string().optional(),
});

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập email")
    .email("Email không hợp lệ"),
});

const updatePasswordSchema = z
  .object({
    new_password: z
      .string()
      .min(8, "Mật khẩu mới phải có ít nhất 8 ký tự")
      .max(72, "Mật khẩu mới không được vượt quá 72 ký tự"),
    confirm_password: z.string().min(1, "Vui lòng nhập lại mật khẩu mới"),
  })
  .refine((value) => value.new_password === value.confirm_password, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirm_password"],
  });

const changePasswordSchema = updatePasswordSchema
  .extend({
    current_password: z.string().min(1, "Vui lòng nhập mật khẩu hiện tại"),
  })
  .refine((value) => value.current_password !== value.new_password, {
    message: "Mật khẩu mới phải khác mật khẩu hiện tại",
    path: ["new_password"],
  });

const resolveSiteUrlFromHeaders = async () => {
  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin");

  if (origin) {
    return origin;
  }

  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";

  if (!host) {
    return null;
  }

  return `${protocol}://${host}`;
};

export type LoginActionState = {
  error?: string;
};

export type ForgotPasswordActionState = {
  error?: string;
  success?: string;
};

export type PasswordActionState = {
  error?: string;
  success?: string;
};

export const loginAction = async (
  _prevState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> => {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    redirectTo: formData.get("redirectTo"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ",
    };
  }

  const supabase = await createActionClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return {
      error:
        error.message === "Invalid login credentials"
          ? "Email hoặc mật khẩu không đúng"
          : error.message,
    };
  }

  redirect(
    parsed.data.redirectTo && parsed.data.redirectTo.startsWith("/")
      ? parsed.data.redirectTo
      : APP_ROUTES.dashboard,
  );
};

export const forgotPasswordAction = async (
  _prevState: ForgotPasswordActionState,
  formData: FormData,
): Promise<ForgotPasswordActionState> => {
  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ",
    };
  }

  const siteUrl = await resolveSiteUrlFromHeaders();

  if (!siteUrl) {
    return {
      error: "Không xác định được địa chỉ hệ thống để gửi email đặt lại mật khẩu",
    };
  }

  const supabase = await createActionClient();
  const redirectTo = `${siteUrl}${APP_ROUTES.authConfirm}?next=${encodeURIComponent(APP_ROUTES.resetPassword)}`;

  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo,
  });

  if (error) {
    return {
      error: error.message,
    };
  }

  return {
    success:
      "Nếu email tồn tại trong hệ thống, bạn sẽ nhận được liên kết đặt lại mật khẩu trong ít phút.",
  };
};

export const changePasswordAction = async (
  _prevState: PasswordActionState,
  formData: FormData,
): Promise<PasswordActionState> => {
  const parsed = changePasswordSchema.safeParse({
    current_password: formData.get("current_password"),
    new_password: formData.get("new_password"),
    confirm_password: formData.get("confirm_password"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ",
    };
  }

  const supabase = await createActionClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user?.email) {
    return {
      error: "Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại",
    };
  }

  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.current_password,
  });

  if (reauthError) {
    return {
      error: "Mật khẩu hiện tại không đúng",
    };
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: parsed.data.new_password,
  });

  if (updateError) {
    return {
      error: updateError.message,
    };
  }

  return {
    success: "Đổi mật khẩu thành công",
  };
};

export const resetPasswordAction = async (
  _prevState: PasswordActionState,
  formData: FormData,
): Promise<PasswordActionState> => {
  const parsed = updatePasswordSchema.safeParse({
    new_password: formData.get("new_password"),
    confirm_password: formData.get("confirm_password"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ",
    };
  }

  const supabase = await createActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error:
        "Phiên đặt lại mật khẩu đã hết hạn hoặc không hợp lệ. Vui lòng gửi lại yêu cầu mới",
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.new_password,
  });

  if (error) {
    return {
      error: error.message,
    };
  }

  return {
    success: "Đặt lại mật khẩu thành công. Bạn có thể tiếp tục sử dụng hệ thống",
  };
};

export const logoutAction = async () => {
  const supabase = await createActionClient();
  await supabase.auth.signOut();
  redirect(APP_ROUTES.login);
};

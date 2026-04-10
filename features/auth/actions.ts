"use server";

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

export type LoginActionState = {
  error?: string;
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

export const logoutAction = async () => {
  const supabase = await createActionClient();
  await supabase.auth.signOut();
  redirect(APP_ROUTES.login);
};

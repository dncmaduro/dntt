"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff, KeyRound, LoaderCircle } from "lucide-react";

import { type PasswordActionState, resetPasswordAction } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: PasswordActionState = {
  error: undefined,
  success: undefined,
};

export function ResetPasswordForm() {
  const [state, formAction, isPending] = useActionState(
    resetPasswordAction,
    initialState,
  );
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="new_password">Mật khẩu mới</Label>
        <div className="relative">
          <Input
            autoComplete="new-password"
            id="new_password"
            name="new_password"
            placeholder="Ít nhất 8 ký tự"
            type={showPassword ? "text" : "password"}
          />
          <button
            aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            className="absolute right-3 top-1/2 inline-flex -translate-y-1/2 items-center justify-center rounded-md p-1 text-muted-foreground hover:text-foreground"
            onClick={() => setShowPassword((value) => !value)}
            type="button"
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirm_password">Nhập lại mật khẩu mới</Label>
        <Input
          autoComplete="new-password"
          id="confirm_password"
          name="confirm_password"
          placeholder="Nhập lại mật khẩu mới"
          type={showPassword ? "text" : "password"}
        />
      </div>

      {state.error ? (
        <p className="rounded-2xl border border-destructive/15 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      {state.success ? (
        <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {state.success}
        </p>
      ) : null}

      <Button className="w-full" disabled={isPending} type="submit">
        {isPending ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : (
          <KeyRound className="size-4" />
        )}
        Cập nhật mật khẩu
      </Button>
    </form>
  );
}

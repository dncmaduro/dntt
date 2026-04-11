"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff, KeyRound, LoaderCircle } from "lucide-react";

import { changePasswordAction, type PasswordActionState } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: PasswordActionState = {
  error: undefined,
  success: undefined,
};

export function ChangePasswordForm() {
  const [state, formAction, isPending] = useActionState(
    changePasswordAction,
    initialState,
  );
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="current_password">Mật khẩu hiện tại</Label>
        <div className="relative">
          <Input
            autoComplete="current-password"
            id="current_password"
            name="current_password"
            placeholder="Nhập mật khẩu hiện tại"
            type={showCurrentPassword ? "text" : "password"}
          />
          <button
            aria-label={showCurrentPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            className="absolute right-3 top-1/2 inline-flex -translate-y-1/2 items-center justify-center rounded-md p-1 text-muted-foreground hover:text-foreground"
            onClick={() => setShowCurrentPassword((value) => !value)}
            type="button"
          >
            {showCurrentPassword ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="new_password">Mật khẩu mới</Label>
        <div className="relative">
          <Input
            autoComplete="new-password"
            id="new_password"
            name="new_password"
            placeholder="Ít nhất 8 ký tự"
            type={showNewPassword ? "text" : "password"}
          />
          <button
            aria-label={showNewPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            className="absolute right-3 top-1/2 inline-flex -translate-y-1/2 items-center justify-center rounded-md p-1 text-muted-foreground hover:text-foreground"
            onClick={() => setShowNewPassword((value) => !value)}
            type="button"
          >
            {showNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
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
          type={showNewPassword ? "text" : "password"}
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
        Đổi mật khẩu
      </Button>
    </form>
  );
}

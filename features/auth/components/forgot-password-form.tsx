"use client";

import Link from "next/link";
import { useActionState } from "react";
import { LoaderCircle, Mail } from "lucide-react";

import {
  forgotPasswordAction,
  type ForgotPasswordActionState,
} from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { APP_ROUTES } from "@/lib/constants";

const initialState: ForgotPasswordActionState = {
  error: undefined,
  success: undefined,
};

export function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState(
    forgotPasswordAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          autoComplete="email"
          id="email"
          name="email"
          placeholder="ban@example.com"
          type="email"
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
          <Mail className="size-4" />
        )}
        Gửi liên kết đặt lại mật khẩu
      </Button>

      <div className="text-center text-sm text-muted-foreground">
        <Link className="font-medium text-primary hover:text-primary/80" href={APP_ROUTES.login}>
          Quay lại đăng nhập
        </Link>
      </div>
    </form>
  );
}

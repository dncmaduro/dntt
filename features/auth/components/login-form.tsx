"use client";

import { useActionState, useState, type FormEvent } from "react";
import Link from "next/link";
import { LoaderCircle, LogIn, Eye, EyeOff } from "lucide-react";

import { loginAction } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { APP_ROUTES } from "@/lib/constants";

const initialState = {
  error: undefined,
};

export function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const [state, formAction, isPending] = useActionState(loginAction, initialState);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    setPassword("");
    formAction(formData);
  };

  return (
    <form action={formAction} className="space-y-5" onSubmit={handleSubmit}>
      <input name="redirectTo" type="hidden" value={redirectTo ?? ""} />

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          autoComplete="email"
          className="h-12"
          id="email"
          name="email"
          placeholder="ban@example.com"
          type="email"
          aria-invalid={Boolean(state.error)}
          aria-describedby={state.error ? "login-form-error" : undefined}
          onChange={(event) => setEmail(event.target.value)}
          value={email}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Mật khẩu</Label>
        <div className="relative">
          <Input
            autoComplete="current-password"
            className="h-12"
            id="password"
            name="password"
            placeholder="Nhập mật khẩu"
            type={showPassword ? "text" : "password"}
            aria-invalid={Boolean(state.error)}
            aria-describedby={state.error ? "login-form-error" : undefined}
            onChange={(event) => setPassword(event.target.value)}
            value={password}
          />
          <button
            type="button"
            aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            onClick={() => setShowPassword((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center justify-center rounded-md p-1 text-muted-foreground hover:text-foreground"
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        <div className="flex justify-end">
          <Link
            className="text-sm font-medium text-primary hover:text-primary/80"
            href={APP_ROUTES.forgotPassword}
          >
            Quên mật khẩu?
          </Link>
        </div>
      </div>

      {state.error ? (
        <p id="login-form-error" role="alert" className="rounded-lg border border-destructive/15 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <Button className="w-full" disabled={isPending} type="submit">
        {isPending ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : (
          <LogIn className="size-4" />
        )}
        Đăng nhập
      </Button>
    </form>
  );
}

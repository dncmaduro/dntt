import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { APP_ROUTES } from "@/lib/constants";
import { env } from "@/lib/env";
import type { Database } from "@/types/database";

const PUBLIC_PATHS = [
  APP_ROUTES.login,
  APP_ROUTES.forgotPassword,
  APP_ROUTES.resetPassword,
  APP_ROUTES.authConfirm,
];
const PUBLIC_WEBHOOK_PATH = "/api/webhooks/notification-email";
const PUBLIC_SHARE_PATH = "/r";

const isPublicPath = (pathname: string) =>
  pathname === PUBLIC_SHARE_PATH ||
  pathname.startsWith(`${PUBLIC_SHARE_PATH}/`) ||
  PUBLIC_PATHS.some(
    (publicPath) => pathname === publicPath || pathname.startsWith(`${publicPath}/`),
  );

const isSupabaseAuthCookie = (name: string) =>
  name.startsWith("sb-") && name.includes("-auth-token");

const hasSupabaseAuthCookie = (request: NextRequest) =>
  request.cookies.getAll().some(({ name }) => isSupabaseAuthCookie(name));

const clearSupabaseAuthCookies = (
  response: NextResponse,
  request: NextRequest,
) => {
  request.cookies
    .getAll()
    .filter(({ name }) => isSupabaseAuthCookie(name))
    .forEach(({ name }) => {
      response.cookies.set(name, "", {
        expires: new Date(0),
        maxAge: 0,
        path: "/",
      });
    });
};

const isInvalidRefreshTokenError = (error: { code?: string; message?: string } | null) => {
  if (!error) {
    return false;
  }

  return (
    error.code === "refresh_token_not_found" ||
    /invalid.*refresh token|refresh token.*not found/i.test(error.message ?? "")
  );
};

export const updateSession = async (request: NextRequest) => {
  const pathname = request.nextUrl.pathname;
  const publicPath = isPublicPath(pathname);

  if (pathname.startsWith(PUBLIC_WEBHOOK_PATH)) {
    return NextResponse.next({
      request,
    });
  }

  if (publicPath && pathname !== APP_ROUTES.login) {
    return NextResponse.next({
      request,
    });
  }

  let response = NextResponse.next({
    request,
  });

  // A missing auth cookie is definitive: avoid an unnecessary round trip to
  // Supabase before redirecting anonymous users to the login page.
  if (!hasSupabaseAuthCookie(request)) {
    if (publicPath) {
      return response;
    }

    const redirectUrl = new URL(APP_ROUTES.login, request.url);
    redirectUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  const supabase = createServerClient<Database>(
    env.supabaseUrl,
    env.supabaseAnonKey,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          response = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (isInvalidRefreshTokenError(authError)) {
    clearSupabaseAuthCookies(response, request);

    if (pathname === APP_ROUTES.login) {
      return response;
    }

    const redirectUrl = new URL(APP_ROUTES.login, request.url);
    redirectUrl.searchParams.set("redirectTo", pathname);
    const redirectResponse = NextResponse.redirect(redirectUrl);
    clearSupabaseAuthCookies(redirectResponse, request);
    return redirectResponse;
  }

  if (!user && !publicPath) {
    const redirectUrl = new URL(APP_ROUTES.login, request.url);
    redirectUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && pathname === APP_ROUTES.login) {
    return NextResponse.redirect(new URL(APP_ROUTES.dashboard, request.url));
  }

  return response;
};

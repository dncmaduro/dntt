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

export const updateSession = async (request: NextRequest) => {
  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith(PUBLIC_WEBHOOK_PATH)) {
    return NextResponse.next({
      request,
    });
  }

  let response = NextResponse.next({
    request,
  });

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
  } = await supabase.auth.getUser();
  const isPublicPath = PUBLIC_PATHS.some(
    (publicPath) => pathname === publicPath || pathname.startsWith(`${publicPath}/`),
  );

  if (!user && !isPublicPath) {
    const redirectUrl = new URL(APP_ROUTES.login, request.url);
    redirectUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && pathname === APP_ROUTES.login) {
    return NextResponse.redirect(new URL(APP_ROUTES.dashboard, request.url));
  }

  return response;
};

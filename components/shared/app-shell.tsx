"use client";

import { useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, ChevronRight, LogOut } from "lucide-react";

import { logoutAction } from "@/features/auth/actions";
import { BrandMark } from "@/components/shared/brand-mark";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ACCOUNTANT_NAVIGATION,
  APP_ROUTES,
  DIRECTOR_NAVIGATION,
  EMPLOYEE_NAVIGATION,
  PAGE_TITLES,
  ROLE_LABELS,
  type UserRole,
} from "@/lib/constants";
import { cn, getInitials } from "@/lib/utils";

type ShellProfile = {
  full_name: string | null;
  role: UserRole;
};

const isMatchingNavigationPath = (pathname: string, href: string) => {
  if (href === APP_ROUTES.dashboard) {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
};

const getActiveNavigationHref = (
  pathname: string,
  navigation: Array<{ href: string }>,
) =>
  navigation
    .filter((item) => isMatchingNavigationPath(pathname, item.href))
    .sort((left, right) => right.href.length - left.href.length)[0]?.href ?? null;

const resolveTitle = (pathname: string) => {
  if (PAGE_TITLES[pathname]) {
    return PAGE_TITLES[pathname];
  }

  if (pathname.startsWith("/my-requests/") && pathname.endsWith("/edit")) {
    return "Chỉnh sửa đề nghị";
  }

  if (pathname.startsWith("/my-requests/") && pathname !== APP_ROUTES.newRequest) {
    return "Chi tiết đề nghị";
  }

  if (pathname.startsWith("/requests/")) {
    return "Chi tiết duyệt đề nghị";
  }

  return "DNTT nội bộ";
};

export function AppShell({
  appVersion,
  children,
  profile,
  unreadCount,
}: {
  appVersion: string;
  children: React.ReactNode;
  profile: ShellProfile;
  unreadCount: number;
}) {
  const pathname = usePathname();
  const logoutFormRef = useRef<HTMLFormElement>(null);
  const navigation =
    profile.role === "employee"
      ? EMPLOYEE_NAVIGATION
      : profile.role === "director"
        ? DIRECTOR_NAVIGATION
        : ACCOUNTANT_NAVIGATION;
  const pageTitle = resolveTitle(pathname);
  const activeNavigationHref = getActiveNavigationHref(pathname, navigation);

  return (
    <div className="min-h-screen md:grid md:h-screen md:grid-cols-[18.5rem_1fr] md:overflow-hidden">
      <aside className="hidden border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:sticky md:top-0 md:flex md:h-screen md:flex-col">
        <div className="px-6 py-6">
          <BrandMark inverted />
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto px-4 pb-6">
          {navigation.map((item) => {
            const isActive = item.href === activeNavigationHref;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all",
                  isActive
                    ? "bg-white/12 text-white"
                    : "text-sidebar-foreground/70 hover:bg-white/6 hover:text-white",
                )}
              >
                <item.icon className="size-4" />
                <span>{item.label}</span>
                {isActive ? <ChevronRight className="ml-auto size-4" /> : null}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border px-6 py-5">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.28em] text-white/50">
              Vai trò
            </p>
            <p className="mt-2 text-base font-semibold">{ROLE_LABELS[profile.role]}</p>
          </div>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col md:h-screen md:min-h-0 md:overflow-y-auto">
        <header className="sticky top-0 z-30 border-b border-border/70 bg-background/88 backdrop-blur-xl">
          <div className="mx-auto flex w-full max-w-7xl items-center gap-4 px-4 py-4 md:px-8">
            <div className="md:hidden">
              <BrandMark compact />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/70">
                DNTT nội bộ
              </p>
              <h2 className="truncate text-xl font-semibold">{pageTitle}</h2>
            </div>
            <span className="hidden rounded-xl border border-border/70 bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground sm:inline-flex">
              v{appVersion}
            </span>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  aria-label="Thông báo"
                  className="relative hidden size-11 rounded-2xl border border-border bg-white/80 p-0 shadow-sm transition hover:bg-white md:inline-flex"
                  variant="ghost"
                >
                  <Bell className="size-4" />
                  {unreadCount > 0 ? (
                    <span className="absolute right-2 top-2 flex min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  ) : null}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                <DropdownMenuLabel>
                  <div className="space-y-1">
                    <p className="font-semibold text-foreground">Thông báo</p>
                    <p className="text-xs text-muted-foreground">
                      {unreadCount > 0
                        ? `Bạn có ${unreadCount} thông báo chưa đọc`
                        : "Không có thông báo chưa đọc"}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={APP_ROUTES.notifications}>Mở trang notifications</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="rounded-2xl px-2.5" variant="secondary">
                  <Avatar className="size-8">
                    <AvatarFallback>{getInitials(profile.full_name)}</AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:block">
                    {profile.full_name ?? "Người dùng"}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>
                  <div className="space-y-1">
                    <p className="font-semibold text-foreground">
                      {profile.full_name ?? "Người dùng"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {ROLE_LABELS[profile.role]}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={APP_ROUTES.profile}>Cập nhật hồ sơ</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={APP_ROUTES.changePassword}>Đổi mật khẩu</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <form action={logoutAction} ref={logoutFormRef} />
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault();
                    logoutFormRef.current?.requestSubmit();
                  }}
                >
                  <LogOut className="size-4" />
                  Đăng xuất
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 pb-28 pt-6 md:min-h-0 md:px-8 md:pb-8">
          {children}
        </main>

        <nav className="fixed inset-x-4 bottom-4 z-40 md:hidden">
          <div className="surface-panel grid grid-cols-4 rounded-[2rem] p-2">
            {navigation.slice(0, 4).map((item) => {
              const isActive = item.href === activeNavigationHref;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-[1.25rem] px-2 py-3 text-[11px] font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  <item.icon className="size-4" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}

'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, LogOut, Menu } from 'lucide-react';

import { logoutAction } from '@/features/auth/actions';
import { BrandMark } from '@/components/shared/brand-mark';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { NotificationBell } from '@/features/notifications/components/notification-bell';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { NotificationsProvider } from '@/features/notifications/components/notifications-provider';
import type { Notification } from '@/features/notifications/types';
import {
  ACCOUNTANT_NAVIGATION,
  APP_ROUTES,
  DIRECTOR_NAVIGATION,
  EMPLOYEE_NAVIGATION,
  PAGE_TITLES,
  ROLE_LABELS,
  type UserRole,
} from '@/lib/constants';
import { cn, getInitials } from '@/lib/utils';

type ShellProfile = {
  id: string;
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
    .sort((left, right) => right.href.length - left.href.length)[0]?.href ??
  null;

const resolveTitle = (pathname: string) => {
  if (PAGE_TITLES[pathname]) {
    return PAGE_TITLES[pathname];
  }

  if (pathname.startsWith('/my-requests/') && pathname.endsWith('/edit')) {
    return 'Chỉnh sửa đề nghị';
  }

  if (
    pathname.startsWith('/my-requests/') &&
    pathname !== APP_ROUTES.newRequest
  ) {
    return 'Chi tiết đề nghị';
  }

  if (pathname.startsWith('/requests/')) {
    return 'Chi tiết duyệt đề nghị';
  }

  return 'Tổng quan';
};

export function AppShell({
  appVersion,
  children,
  initialNotificationError,
  initialNotifications,
  initialUnreadCount,
  profile,
}: {
  appVersion: string;
  children: React.ReactNode;
  initialNotificationError: string | null;
  initialNotifications: Notification[];
  initialUnreadCount: number;
  profile: ShellProfile;
}) {
  const pathname = usePathname();
  const logoutFormRef = useRef<HTMLFormElement>(null);
  const navigation =
    profile.role === 'employee'
      ? EMPLOYEE_NAVIGATION
      : profile.role === 'director'
        ? DIRECTOR_NAVIGATION
        : ACCOUNTANT_NAVIGATION;
  const pageTitle = resolveTitle(pathname);
  const activeNavigationHref = getActiveNavigationHref(pathname, navigation);

  return (
    <NotificationsProvider
      initialError={initialNotificationError}
      initialNotifications={initialNotifications}
      initialUnreadCount={initialUnreadCount}
      userId={profile.id}
      userRole={profile.role}
    >
      <div className="min-h-screen lg:grid lg:h-screen lg:grid-cols-[16rem_1fr] lg:overflow-hidden">
        <aside className="hidden border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
          <div className="px-6 py-6">
            <BrandMark inverted />
          </div>

          <nav aria-label="Điều hướng chính" className="flex-1 space-y-1 overflow-y-auto px-4 pb-6">
            {navigation.map((item) => {
              const isActive = item.href === activeNavigationHref;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors duration-150',
                    isActive
                      ? 'bg-primary text-white'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-white',
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <item.icon className="size-4" />
                  <span>{item.label}</span>
                  {isActive ? (
                    <ChevronRight className="ml-auto size-4" />
                  ) : null}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-sidebar-border px-6 py-5">
            <div className="rounded-lg border border-white/10 bg-sidebar-accent p-4">
              <p className="text-xs font-bold text-white/50">
                Vai trò
              </p>
              <p className="mt-2 text-base font-semibold">
                {ROLE_LABELS[profile.role]}
              </p>
            </div>
          </div>
        </aside>

        <div className="flex min-h-screen flex-col lg:h-screen lg:min-h-0 lg:overflow-y-auto">
          <header className="sticky top-0 z-30 border-b border-border bg-background">
            <div className="mx-auto flex w-full max-w-7xl items-center gap-4 px-4 py-3 lg:px-7">
              <div className="flex items-center gap-3 lg:hidden">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button
                      aria-label="Mở menu điều hướng"
                      className="size-10"
                      size="icon"
                      variant="outline"
                    >
                      <Menu className="size-4" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent
                    className="w-[min(20rem,calc(100vw-2.5rem))] border-r-0 bg-sidebar p-0 text-sidebar-foreground"
                    side="left"
                  >
                    <SheetTitle className="sr-only">Menu điều hướng</SheetTitle>
                    <div className="flex h-full flex-col">
                      <div className="px-6 py-6">
                        <BrandMark inverted />
                      </div>
                      <nav aria-label="Điều hướng chính" className="flex-1 space-y-1 overflow-y-auto px-4 pb-6">
                        {navigation.map((item) => {
                          const isActive = item.href === activeNavigationHref;

                          return (
                            <SheetClose asChild key={item.href}>
                              <Link
                                href={item.href}
                                className={cn(
                                  'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors duration-150',
                                  isActive
                                    ? 'bg-primary text-white'
                                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-white',
                                )}
                                aria-current={isActive ? 'page' : undefined}
                              >
                                <item.icon className="size-4" />
                                <span>{item.label}</span>
                                {isActive ? (
                                  <ChevronRight className="ml-auto size-4" />
                                ) : null}
                              </Link>
                            </SheetClose>
                          );
                        })}
                      </nav>
                      <div className="border-t border-sidebar-border px-6 py-5">
                        <div className="rounded-lg border border-white/10 bg-sidebar-accent p-4">
                          <p className="text-xs font-bold text-white/50">
                            Vai trò
                          </p>
                          <p className="mt-2 text-base font-semibold">
                            {ROLE_LABELS[profile.role]}
                          </p>
                        </div>
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
                <BrandMark compact />
              </div>

              <div className="min-w-0 flex-1 space-y-0.5">
                <h2 className="truncate text-xl font-semibold">{pageTitle}</h2>
              </div>
              <span className="hidden rounded-lg border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground sm:inline-flex">
                v{appVersion}
              </span>

              <NotificationBell />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="rounded-md px-2.5" variant="secondary">
                    <Avatar className="size-8">
                      <AvatarFallback>
                        {getInitials(profile.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:block">
                      {profile.full_name ?? 'Người dùng'}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel>
                    <div className="space-y-1">
                      <p className="font-semibold text-foreground">
                        {profile.full_name ?? 'Người dùng'}
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

          <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 pb-10 pt-6 lg:min-h-0 lg:px-7">
            {children}
          </main>
        </div>
      </div>
    </NotificationsProvider>
  );
}

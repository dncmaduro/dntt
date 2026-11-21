import { redirect } from "next/navigation";

import { BrandMark } from "@/components/shared/brand-mark";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { LoginForm } from "@/features/auth/components/login-form";
import { getCurrentProfile } from "@/lib/auth/session";

type LoginPageProps = {
  searchParams: Promise<{
    redirectTo?: string | string[];
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const profile = await getCurrentProfile();

  if (profile) {
    redirect("/");
  }

  const query = await searchParams;
  const redirectTo = Array.isArray(query.redirectTo)
    ? query.redirectTo[0]
    : query.redirectTo;

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-6">
      <Card className="w-full max-w-md overflow-hidden rounded-xl">
        <CardHeader className="space-y-6 border-b border-border pb-6">
          <BrandMark />
          <div>
            <h1 className="text-2xl font-semibold">Đăng nhập vào DNTT</h1>
          </div>
        </CardHeader>
        <CardContent className="p-6 sm:p-8">
          <LoginForm redirectTo={redirectTo} />
        </CardContent>
      </Card>
    </main>
  );
}

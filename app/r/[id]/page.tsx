import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { getCurrentProfile } from "@/lib/auth/session";
import { getSharedPaymentRequestPreview } from "@/features/payment-requests/queries";
import { isPaymentRequestShareIdentifier } from "@/features/payment-requests/share";
import { APP_ROUTES } from "@/lib/constants";

export const dynamic = "force-dynamic";

type SharedRequestPageProps = {
  params: Promise<{ id: string }>;
};

const getRequestPreview = async (params: SharedRequestPageProps["params"]) => {
  const { id } = await params;
  const identifier = id.trim().toLowerCase();

  return isPaymentRequestShareIdentifier(identifier)
    ? getSharedPaymentRequestPreview(identifier)
    : null;
};

export async function generateMetadata({
  params,
}: SharedRequestPageProps): Promise<Metadata> {
  const request = await getRequestPreview(params);

  if (!request) {
    return {};
  }

  const description = request.description || "Đề nghị thanh toán nội bộ";

  return {
    title: request.title,
    description,
    openGraph: {
      title: request.title,
      description,
      images: [
        {
          url: `/r/${(await params).id}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: `QR thanh toán — ${request.title}`,
        },
      ],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: request.title,
      description,
      images: [`/r/${(await params).id}/opengraph-image`],
    },
  };
}

export default async function SharedRequestPage({
  params,
}: SharedRequestPageProps) {
  const [request, profile] = await Promise.all([
    getRequestPreview(params),
    getCurrentProfile(),
  ]);

  if (!request) {
    notFound();
  }

  if (profile) {
    const detailBase = request.userId === profile.id
      ? APP_ROUTES.myRequests
      : APP_ROUTES.requests;
    const { id } = await params;

    redirect(`${detailBase}/${id}`);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted p-6 text-center">
      <p className="text-sm text-muted-foreground">
        Đăng nhập để xem đề nghị thanh toán.
      </p>
    </main>
  );
}

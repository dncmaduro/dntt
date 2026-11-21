import type { Metadata } from "next";

import "@/app/globals.css";

import { Providers } from "@/components/shared/providers";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "https://dntt-mcd.vercel.app",
  ),
  title: {
    default: "DNTT nội bộ",
    template: "%s | DNTT nội bộ",
  },
  description: "Hệ thống quản lý đề nghị thanh toán nội bộ.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className="min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

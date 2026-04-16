"use client";

import { Suspense } from "react";
import { Toaster } from "sonner";
import { TopRouteProgress } from "@/components/shared/top-route-progress";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense fallback={null}>
        <TopRouteProgress />
      </Suspense>
      {children}
      <Toaster
        position="top-right"
        richColors
        closeButton
        toastOptions={{
          classNames: {
            toast: "font-sans",
          },
        }}
      />
    </>
  );
}

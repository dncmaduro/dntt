"use client";

import { Suspense } from "react";
import { Toaster } from "sonner";
import {
  DataNavigationProvider,
  DataNavigationSync,
} from "@/components/shared/data-navigation";
import { TopRouteProgress } from "@/components/shared/top-route-progress";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <DataNavigationProvider>
      <Suspense fallback={null}>
        <DataNavigationSync />
        <TopRouteProgress />
      </Suspense>
      {children}
      <Toaster
        position="top-right"
        closeButton
        toastOptions={{
          classNames: {
            toast: "font-sans rounded-lg border-border bg-card shadow-[0_20px_50px_-30px_rgba(15,23,42,0.55)]",
            title: "font-semibold text-card-foreground",
            description: "text-muted-foreground",
          },
        }}
      />
    </DataNavigationProvider>
  );
}

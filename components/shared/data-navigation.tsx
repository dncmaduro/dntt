"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";

const DATA_NAVIGATION_TIMEOUT_MS = 12_000;

type DataNavigationContextValue = {
  isPending: boolean;
  finish: () => void;
  start: () => void;
};

const DataNavigationContext = createContext<DataNavigationContextValue | null>(
  null,
);

export function DataNavigationProvider({ children }: { children: React.ReactNode }) {
  const [isPending, setIsPending] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  const finish = useCallback(() => {
    setIsPending(false);

    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    setIsPending(true);

    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = window.setTimeout(() => {
      finish();
    }, DATA_NAVIGATION_TIMEOUT_MS);
  }, [finish]);

  const value = useMemo(
    () => ({ finish, isPending, start }),
    [finish, isPending, start],
  );

  useEffect(
    () => () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    },
    [],
  );

  return (
    <DataNavigationContext.Provider value={value}>
      {children}
    </DataNavigationContext.Provider>
  );
}

export function DataNavigationSync() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const previousRouteKeyRef = useRef<string | null>(null);
  const { finish } = useDataNavigation();
  const routeKey = `${pathname}?${searchParams.toString()}`;

  useEffect(() => {
    if (previousRouteKeyRef.current === null) {
      previousRouteKeyRef.current = routeKey;
      return;
    }

    if (previousRouteKeyRef.current !== routeKey) {
      previousRouteKeyRef.current = routeKey;
      finish();
    }
  }, [finish, routeKey]);

  return null;
}

export function useDataNavigation() {
  const context = useContext(DataNavigationContext);

  if (!context) {
    throw new Error("useDataNavigation must be used inside DataNavigationProvider");
  }

  return context;
}

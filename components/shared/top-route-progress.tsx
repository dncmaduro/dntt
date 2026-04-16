"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

type ProgressPhase = "idle" | "running" | "finishing";

const MAX_PROGRESS_MS = 9000;
const FINISH_MS = 260;

const isInternalNavigation = (anchor: HTMLAnchorElement) => {
  const href = anchor.getAttribute("href");

  if (!href || href.startsWith("#")) {
    return false;
  }

  if (anchor.target && anchor.target !== "_self") {
    return false;
  }

  if (anchor.hasAttribute("download")) {
    return false;
  }

  try {
    const url = new URL(anchor.href, window.location.href);

    if (url.origin !== window.location.origin) {
      return false;
    }

    const current = new URL(window.location.href);

    return (
      url.pathname !== current.pathname ||
      url.search !== current.search ||
      url.hash !== current.hash
    );
  } catch {
    return false;
  }
};

export function TopRouteProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [phase, setPhase] = useState<ProgressPhase>("idle");
  const maxTimerRef = useRef<number | null>(null);
  const finishTimerRef = useRef<number | null>(null);

  const routeKey = useMemo(
    () => `${pathname}?${searchParams.toString()}`,
    [pathname, searchParams],
  );

  const clearTimers = useCallback(() => {
    if (maxTimerRef.current) {
      window.clearTimeout(maxTimerRef.current);
      maxTimerRef.current = null;
    }

    if (finishTimerRef.current) {
      window.clearTimeout(finishTimerRef.current);
      finishTimerRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    if (phase !== "idle") {
      return;
    }

    setPhase("running");
    maxTimerRef.current = window.setTimeout(() => {
      setPhase("idle");
      clearTimers();
    }, MAX_PROGRESS_MS);
  }, [clearTimers, phase]);

  const finish = useCallback(() => {
    if (phase === "idle") {
      return;
    }

    setPhase("finishing");
    if (finishTimerRef.current) {
      window.clearTimeout(finishTimerRef.current);
    }

    finishTimerRef.current = window.setTimeout(() => {
      setPhase("idle");
      clearTimers();
    }, FINISH_MS);
  }, [clearTimers, phase]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a");

      if (!anchor || !(anchor instanceof HTMLAnchorElement)) {
        return;
      }

      if (isInternalNavigation(anchor)) {
        start();
      }
    };

    const onPopState = () => {
      start();
    };

    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPopState);

    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPopState);
    };
  }, [start]);

  useEffect(() => {
    if (phase === "idle") {
      return;
    }

    const timer = window.setTimeout(() => {
      finish();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [finish, phase, routeKey]);

  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, [clearTimers]);

  if (phase === "idle") {
    return null;
  }

  return (
    <div className="route-progress" data-phase={phase} role="progressbar" aria-label="Đang tải trang" />
  );
}

import { createBrowserClient } from "@supabase/ssr";

import { env } from "@/lib/env";
import type { Database } from "@/types/database";

let browserClient:
  | ReturnType<typeof createBrowserClient<Database>>
  | undefined;

export const createBrowserSupabaseClient = () => {
  if (!browserClient) {
    browserClient = createBrowserClient<Database>(
      env.supabaseUrl,
      env.supabaseAnonKey,
    );
  }

  return browserClient;
};

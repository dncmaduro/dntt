import { cache } from "react";
import { redirect } from "next/navigation";

import { APP_ROUTES, ROLES, type UserRole } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import type { ProfileRow } from "@/types/database";

export type AuthenticatedProfile = ProfileRow & {
  role: UserRole;
};

export const getSessionUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
});

export const getCurrentProfile = cache(async () => {
  const user = await getSessionUser();

  if (!user) {
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) {
    if (error.message.toLowerCase().includes("stack depth limit exceeded")) {
      throw new Error(
        "Unable to load profile because the Supabase RLS policy for public.profiles is recursively querying itself. Apply the migration in supabase/migrations/202604081620_fix_recursive_rls_policies.sql.",
      );
    }

    throw new Error(`Unable to load profile: ${error.message}`);
  }

  if (!data) {
    throw new Error("Profile row was not found for the authenticated user.");
  }

  const normalizedRole =
    typeof data.role === "string" ? data.role.trim().toLowerCase() : "";

  if (!ROLES.includes(normalizedRole as UserRole)) {
    throw new Error(`Invalid profile role: ${String(data.role ?? "")}`);
  }

  return {
    ...data,
    role: normalizedRole as UserRole,
  } satisfies AuthenticatedProfile;
});

export const requireAuth = async () => {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect(APP_ROUTES.login);
  }

  return profile;
};

export const requireRole = async (allowedRoles: UserRole[]) => {
  const profile = await requireAuth();

  if (!allowedRoles.includes(profile.role)) {
    redirect(APP_ROUTES.dashboard);
  }

  return profile;
};

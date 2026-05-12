"use client";

import { useEffect, useState } from "react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "./browser";

type UserProfile = {
  id: string;
  role: "customer" | "rider" | "admin";
  full_name: string | null;
  phone: string | null;
};

async function ensureRiderRow(supabase: SupabaseClient, userId: string) {
  const { error } = await supabase.from("riders").upsert({ id: userId }, { onConflict: "id" });
  if (error) console.warn("[laundra] ensureRiderRow:", error.message);
}

export function useSupabaseUser() {
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authResolved, setAuthResolved] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [envError, setEnvError] = useState<string | null>(null);

  useEffect(() => {
    try {
      setSupabase(createSupabaseBrowserClient());
      setEnvError(null);
    } catch (e: unknown) {
      setEnvError(e instanceof Error ? e.message : "Supabase is not configured.");
      setSupabase(null);
      setAuthResolved(true);
    }
  }, []);

  useEffect(() => {
    if (!supabase) return;

    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      setAuthResolved(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      setAuthResolved(true);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (!supabase) return;

    if (!user) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }

    let mounted = true;

    const syncProfile = async () => {
      setProfileLoading(true);

      const meta = user.user_metadata as { role?: string; full_name?: string } | undefined;
      const metaRole =
        meta?.role === "rider" || meta?.role === "customer" || meta?.role === "admin"
          ? meta.role
          : null;

      const pendingRaw =
        typeof window !== "undefined" ? window.localStorage.getItem("laundra_role") : null;
      const pendingRole =
        pendingRaw === "rider" || pendingRaw === "customer" || pendingRaw === "admin"
          ? pendingRaw
          : null;

      const { data: existing, error: fetchError } = await supabase
        .from("profiles")
        .select("id,role,full_name,phone")
        .eq("id", user.id)
        .maybeSingle();

      if (!mounted) return;

      if (fetchError) {
        console.error(fetchError);
        if (mounted) {
          setProfile(null);
          setProfileLoading(false);
        }
        return;
      }

      let resolved = existing as UserProfile | null;

      const desiredRole = pendingRole ?? metaRole;

      if (!resolved) {
        const role = (desiredRole === "rider" || desiredRole === "admin" ? desiredRole : "customer") as
          | "customer"
          | "rider"
          | "admin";
        const { data: inserted, error: insertError } = await supabase
          .from("profiles")
          .insert({
            id: user.id,
            role,
            full_name: meta?.full_name ?? null,
          })
          .select("id,role,full_name,phone")
          .single();

        if (!mounted) return;

        if (!insertError && inserted) {
          resolved = inserted as UserProfile;
          if (resolved.role === "rider") await ensureRiderRow(supabase, user.id);
        }
      } else if (
        desiredRole &&
        desiredRole !== resolved.role &&
        !(resolved.role === "rider" && desiredRole === "customer") &&
        !(resolved.role === "admin")
      ) {
        const { data: updated, error: updateError } = await supabase
          .from("profiles")
          .update({ role: desiredRole })
          .eq("id", user.id)
          .select("id,role,full_name,phone")
          .single();

        if (!mounted) return;

        if (!updateError && updated) {
          resolved = updated as UserProfile;
          if (resolved.role === "rider") await ensureRiderRow(supabase, user.id);
        }
      } else if (resolved.role === "rider") {
        await ensureRiderRow(supabase, user.id);
      }

      if (typeof window !== "undefined") {
        window.localStorage.removeItem("laundra_role");
      }

      if (mounted) {
        setProfile(resolved);
        setProfileLoading(false);
      }
    };

    syncProfile();

    return () => {
      mounted = false;
    };
  }, [supabase, user]);

  return {
    supabase,
    user,
    profile,
    loading: !authResolved || profileLoading,
    envError,
  };
}

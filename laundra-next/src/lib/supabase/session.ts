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

export function useSupabaseUser() {
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [envError, setEnvError] = useState<string | null>(null);

  useEffect(() => {
    // Avoid initializing Supabase during prerender/build
    try {
      setSupabase(createSupabaseBrowserClient());
      setEnvError(null);
    } catch (e: any) {
      setEnvError(e?.message ?? "Supabase is not configured.");
    }
  }, []);

  useEffect(() => {
    if (!supabase) return;
    let mounted = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setUser(data.user ?? null);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
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

    const ensureProfile = async () => {
      setProfileLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("id,role,full_name,phone")
        .eq("id", user.id)
        .maybeSingle();

      if (!mounted) return;
      if (error) {
        setProfileLoading(false);
        return;
      }

      if (data) {
        setProfile(data as UserProfile);
        setProfileLoading(false);
        return;
      }

      const pendingRole =
        typeof window !== "undefined" ? window.localStorage.getItem("laundra_role") : null;
      const role = pendingRole === "rider" || pendingRole === "admin" ? pendingRole : "customer";

      const { data: inserted, error: insertError } = await supabase
        .from("profiles")
        .insert({
          id: user.id,
          role,
          full_name: (user.user_metadata as any)?.full_name ?? null,
        })
        .select("id,role,full_name,phone")
        .single();

      if (!mounted) return;
      if (!insertError && inserted) {
        setProfile(inserted as UserProfile);
      }
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("laundra_role");
      }
      setProfileLoading(false);
    };

    ensureProfile();

    return () => {
      mounted = false;
    };
  }, [supabase, user]);

  return { supabase, user, profile, loading: loading || profileLoading, envError };
}


"use client";

import { useEffect, useState, useRef } from "react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "./browser";

export function useSupabaseUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabaseRef = useRef<SupabaseClient | null>(null);

  useEffect(() => {
    let mounted = true;

    try {
      const supabase = createSupabaseBrowserClient();
      supabaseRef.current = supabase;

      supabase.auth.getUser().then(({ data }) => {
        if (!mounted) return;
        setUser(data.user ?? null);
        setLoading(false);
      });

      const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!mounted) return;
        setUser(session?.user ?? null);
      });

      return () => {
        mounted = false;
        sub.subscription.unsubscribe();
      };
    } catch (error) {
      if (mounted) {
        console.error("Failed to initialize Supabase:", error);
        setLoading(false);
      }
    }
  }, []);

  return { supabase: supabaseRef.current, user, loading };
}


"use client";

import { createClient } from "@supabase/supabase-js";
import { getPublicEnv } from "@/lib/env";

let supabaseInstance: ReturnType<typeof createClient> | null = null;

export function createSupabaseBrowserClient() {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  const env = getPublicEnv();
  if (env.NEXT_PUBLIC_SUPABASE_ANON_KEY === "missing") {
    throw new Error(
      "Supabase env is not configured. Create `laundra-next/.env.local` from `.env.example`.",
    );
  }

  supabaseInstance = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  });

  return supabaseInstance;
}


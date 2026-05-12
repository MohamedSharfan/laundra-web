"use client";

import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function AuthPage() {
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [envError, setEnvError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      setSupabase(createSupabaseBrowserClient());
    } catch (e: any) {
      setEnvError(e?.message ?? "Supabase is not configured.");
    }
  }, []);

  const sendMagicLink = async () => {
    setStatus("sending");
    setError(null);
    if (!supabase) return;
    const { error: signInError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: typeof window !== "undefined" ? `${window.location.origin}/` : undefined,
      },
    });
    if (signInError) {
      setStatus("error");
      setError(signInError.message);
      return;
    }
    setStatus("sent");
  };

  return (
    <div className="section-pad" style={{ paddingTop: 120, background: "var(--bg)" }}>
      <div className="section-inner">
        <div className="section-label animate-in">Authentication</div>
        <h2 className="section-title animate-in">
          Sign In
          <br />
          Securely.
        </h2>

        <div className="config-card animate-in" style={{ maxWidth: 720 }}>
          <div className="config-title">Magic Link</div>

          {envError && (
            <div style={{ color: "var(--red)", fontWeight: 800, marginBottom: 12 }}>
              {envError}
            </div>
          )}

          <label
            style={{
              fontFamily: "Space Grotesk",
              fontSize: 10,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              marginBottom: 8,
              display: "block",
              opacity: 0.6,
            }}
          >
            Email
          </label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="YOU@EXAMPLE.COM"
            inputMode="email"
            style={{
              width: "100%",
              border: "3px solid var(--black)",
              padding: "12px 14px",
              fontFamily: "Space Grotesk",
              fontWeight: 700,
              fontSize: 13,
              textTransform: "uppercase",
              outline: "none",
              background: "white",
              marginBottom: 16,
            }}
          />

          <button
            className="btn-yellow"
            type="button"
            onClick={sendMagicLink}
            disabled={status === "sending" || !supabase}
          >
            {status === "sending" ? "Sending..." : "Send Magic Link"}
          </button>

          {status === "sent" && (
            <div style={{ marginTop: 16, fontFamily: "Space Grotesk", fontWeight: 800, textTransform: "uppercase" }}>
              Check your email to continue.
            </div>
          )}
          {error && (
            <div style={{ marginTop: 16, color: "var(--red)", fontWeight: 700 }}>
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


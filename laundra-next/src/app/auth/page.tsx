"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSupabaseUser } from "@/lib/supabase/session";

export default function AuthPage() {
  const { supabase, user, profile, loading, envError } = useSupabaseUser();
  const router = useRouter();
  const search = useSearchParams();
  const [email, setEmail] = useState("");
  const roleParam = search.get("role");
  const defaultRole = useMemo(
    () => (roleParam === "rider" ? "rider" : "customer"),
    [roleParam],
  );
  const [role, setRole] = useState<"customer" | "rider">(defaultRole);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRole(defaultRole);
  }, [defaultRole]);

  useEffect(() => {
    if (loading) return;
    if (user && profile) {
      router.replace(profile.role === "rider" ? "/rider" : "/customer");
    }
  }, [loading, user, profile, router]);

  const sendMagicLink = async () => {
    setStatus("sending");
    setError(null);
    if (!supabase) return;
    if (typeof window !== "undefined") {
      window.localStorage.setItem("laundra_role", role);
    }
    const { error: signInError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: typeof window !== "undefined" ? `${window.location.origin}/` : undefined,
        data: { role },
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

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 12,
              marginBottom: 16,
            }}
          >
            {["customer", "rider"].map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setRole(option as "customer" | "rider")}
                style={{
                  border: "3px solid var(--black)",
                  background: role === option ? "var(--yellow)" : "white",
                  boxShadow: "4px 4px 0 0 var(--black)",
                  padding: "12px 14px",
                  fontFamily: "Space Grotesk",
                  fontWeight: 900,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  fontSize: 11,
                  cursor: "pointer",
                }}
              >
                {option === "customer" ? "I am a customer" : "I am a rider"}
              </button>
            ))}
          </div>

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


"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  AUTH_NEXT_STORAGE_KEY,
  clearStoredAuthNext,
  readSafeInternalPath,
  readStoredAuthNext,
} from "@/lib/auth-navigation";
import { isAuthBypassEnabled, isAuthPageDevEnabled } from "@/lib/auth-bypass";
import { useSupabaseUser } from "@/lib/supabase/session";

type Props = {
  fixedRole: "customer" | "rider";
};

export default function MagicLinkAuth({ fixedRole }: Props) {
  const { supabase, user, profile, loading, envError } = useSupabaseUser();
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const nextParam = search.get("next");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const title = useMemo(
    () =>
      fixedRole === "rider"
        ? ["Rider sign in", "Access your portal."]
        : ["Customer sign in", "Track orders & bookings."],
    [fixedRole],
  );

  useEffect(() => {
    if (loading) return;

    if (isAuthPageDevEnabled()) return;

    const fromUrl = readSafeInternalPath(nextParam);
    const safeNext = fromUrl ?? readStoredAuthNext();

    // Dev preview: open routes — but keep login pages usable for magic link & rider signup.
    if (isAuthBypassEnabled() && !user) {
      if (pathname.startsWith("/login/") || pathname === "/auth") return;
      if (safeNext) clearStoredAuthNext();
      router.replace(safeNext ?? "/");
      return;
    }

    if (user && !profile) {
      if (safeNext) clearStoredAuthNext();
      router.replace(safeNext ?? "/customer");
      return;
    }

    if (user && profile) {
      if (safeNext) {
        clearStoredAuthNext();
        router.replace(safeNext);
        return;
      }
      if (fixedRole === "rider" && profile.role === "customer") {
        return;
      }
      clearStoredAuthNext();
      const fallback = profile.role === "rider" ? "/rider" : "/customer";
      router.replace(fallback);
    }
  }, [loading, user, profile, router, nextParam, pathname, fixedRole]);

  const becomeRiderForCustomer = async () => {
    if (!supabase || !user) return;
    setError(null);
    const { error: profErr } = await supabase.from("profiles").update({ role: "rider" }).eq("id", user.id);
    if (profErr) {
      setError(profErr.message);
      return;
    }
    const { error: riderErr } = await supabase.from("riders").upsert({ id: user.id }, { onConflict: "id" });
    if (riderErr) {
      setError(riderErr.message);
      return;
    }
    router.replace("/rider");
  };

  const sendMagicLink = async () => {
    setStatus("sending");
    setError(null);
    if (!supabase) return;
    if (typeof window !== "undefined") {
      window.localStorage.setItem("laundra_role", fixedRole);
    }
    if (typeof window !== "undefined") {
      const n = new URLSearchParams(window.location.search).get("next");
      const safe = readSafeInternalPath(n);
      if (safe) {
        window.localStorage.setItem(AUTH_NEXT_STORAGE_KEY, safe);
      }
    }

    const authReturnUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}${pathname}${window.location.search || ""}`
        : undefined;

    const { error: signInError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: authReturnUrl,
        data: { role: fixedRole },
      },
    });
    if (signInError) {
      setStatus("error");
      setError(signInError.message);
      return;
    }
    setStatus("sent");
  };

  if (isAuthPageDevEnabled()) {
    return (
      <div className="section-pad" style={{ paddingTop: 120, background: "var(--bg)" }}>
        <div className="section-inner">
          <div
            className="config-card animate-in"
            style={{
              maxWidth: 720,
              marginBottom: 18,
              borderColor: "var(--black)",
              background: "var(--yellow)",
            }}
          >
            <div className="config-title">Auth page — dev layout</div>
            <p style={{ fontFamily: "Inter", lineHeight: 1.6, opacity: 0.9, margin: 0 }}>
              Magic link UI and redirects are off while <code>NEXT_PUBLIC_LAUDRA_AUTH_DEV</code> is true. Set it to
              false when you want the real sign-in flow back.
            </p>
          </div>

          <div className="config-card animate-in" style={{ maxWidth: 720, minHeight: 120 }}>
            <div className="config-title">
              {fixedRole === "rider" ? "Rider login" : "Customer login"}
            </div>
            <p style={{ margin: 0, opacity: 0.65, fontFamily: "Inter", lineHeight: 1.5 }}>
              Placeholder — replace this card with your layout.
            </p>
          </div>

          {envError && (
            <div style={{ color: "var(--red)", fontWeight: 800, marginTop: 16 }}>
              {envError}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="section-pad" style={{ paddingTop: 120, background: "var(--bg)" }}>
      <div className="section-inner">
        <div className="section-label animate-in">
          {fixedRole === "rider" ? "Riders" : "Customers"}
        </div>
        <h2 className="section-title animate-in">
          {title[0]}
          <br />
          {title[1]}
        </h2>

        <div className="config-card animate-in" style={{ maxWidth: 720 }}>
          <div className="config-title">Magic Link</div>

          {isAuthBypassEnabled() && (
            <div
              style={{
                marginBottom: 14,
                padding: "12px 14px",
                border: "3px solid var(--black)",
                background: "var(--yellow)",
                fontFamily: "Space Grotesk",
                fontWeight: 800,
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              App routes are open — magic link still works when email provider allows it
            </div>
          )}

          {envError && (
            <div style={{ color: "var(--red)", fontWeight: 800, marginBottom: 12 }}>
              {envError}
            </div>
          )}

          {user && profile?.role === "customer" && fixedRole === "rider" && (
            <div
              style={{
                marginBottom: 20,
                padding: "14px 16px",
                border: "3px solid var(--black)",
                background: "white",
                boxShadow: "6px 6px 0 0 var(--black)",
              }}
            >
              <div className="config-title" style={{ marginBottom: 8 }}>
                Switch to rider
              </div>
              <div style={{ marginBottom: 12, fontFamily: "Inter", lineHeight: 1.5 }}>
                You are signed in as a customer. Confirm to open the rider portal for this account.
              </div>
              <button className="btn-yellow" type="button" onClick={becomeRiderForCustomer}>
                Become a rider on this account
              </button>
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

          <p style={{ marginTop: 20, fontFamily: "Inter", fontSize: 13, lineHeight: 1.5, opacity: 0.75 }}>
            {fixedRole === "rider" ? (
              <>
                Need the customer dashboard instead?{" "}
                <Link href="/login/customer" style={{ fontWeight: 700, textDecoration: "underline" }}>
                  Customer sign in
                </Link>
              </>
            ) : (
              <>
                Want to deliver with us?{" "}
                <Link href="/login/rider" style={{ fontWeight: 700, textDecoration: "underline" }}>
                  Rider sign in
                </Link>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import LaundraRouteLoader from "@/components/LaundraRouteLoader";
import { isAuthBypassEnabled } from "@/lib/auth-bypass";
import { useSupabaseUser } from "@/lib/supabase/session";

type BookingRow = {
  id: string;
  package_id: string;
  service_type: string;
  pickup_address: string;
  pickup_city: string;
  scheduled_date: string;
  scheduled_window: string;
  status: string;
  total_lkr: number;
  created_at: string;
};

function formatLKR(amount: number) {
  return `Rs. ${amount.toLocaleString("en-LK")}`;
}

export default function CustomerClient() {
  const { supabase, user, profile, loading: authLoading } = useSupabaseUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [rows, setRows] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const newlyCreated = searchParams.get("new");
  const prevStatusRef = useRef<Record<string, string>>({});
  const [acceptBanner, setAcceptBanner] = useState<string | null>(null);

  const fetchBookings = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!user || !supabase) return;
      if (!opts?.silent) {
        setLoading(true);
      }
      setError(null);
      const { data, error: qErr } = await supabase
        .from("bookings")
        .select(
          "id,package_id,service_type,pickup_address,pickup_city,scheduled_date,scheduled_window,status,total_lkr,created_at",
        )
        .eq("customer_id", user.id)
        .order("created_at", { ascending: false });

      if (qErr) {
        setError(qErr.message);
        if (!opts?.silent) setLoading(false);
        return;
      }
      setRows((data ?? []) as BookingRow[]);
      if (!opts?.silent) setLoading(false);
    },
    [supabase, user],
  );

  useEffect(() => {
    if (authLoading || isAuthBypassEnabled()) return;
    if (!user) {
      router.replace("/login/customer");
      return;
    }
    if (profile?.role === "rider") {
      router.replace("/rider");
    }
  }, [authLoading, user, profile?.role, router]);

  useEffect(() => {
    if (authLoading) return;

    if (isAuthBypassEnabled() && !user) {
      setLoading(false);
      setRows([]);
      setError(null);
      return;
    }

    if (!user || !supabase) {
      setLoading(false);
      return;
    }

    fetchBookings();

    const channel = supabase
      .channel("customer-bookings")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings", filter: `customer_id=eq.${user.id}` },
        () => fetchBookings({ silent: true }),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authLoading, user?.id, supabase, fetchBookings]);

  useEffect(() => {
    if (!newlyCreated || !user || !supabase) return;

    let cancelled = false;
    const run = async () => {
      for (let i = 0; i < 12; i++) {
        if (cancelled) return;
        await fetchBookings({ silent: true });
        await new Promise((r) => setTimeout(r, 350));
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [newlyCreated, user?.id, supabase, fetchBookings]);

  useEffect(() => {
    const waiting = rows.some((r) => r.status === "booking_placed");
    if (!waiting || !user || !supabase) return;

    const iv = window.setInterval(() => {
      fetchBookings({ silent: true });
    }, 4500);

    return () => window.clearInterval(iv);
  }, [rows, user?.id, supabase, fetchBookings]);

  useEffect(() => {
    for (const b of rows) {
      const prev = prevStatusRef.current[b.id];
      prevStatusRef.current[b.id] = b.status;
      if (
        prev === "booking_placed" &&
        (b.status === "rider_assigned" || b.status === "rider_arriving")
      ) {
        setAcceptBanner("Rider accepted — your pickup is confirmed.");
        window.setTimeout(() => setAcceptBanner(null), 8000);
        break;
      }
    }
  }, [rows]);

  const bypass = isAuthBypassEnabled();

  const highlightBooking = useMemo(() => {
    if (!newlyCreated) return null;
    return rows.find((r) => r.id === newlyCreated) ?? null;
  }, [rows, newlyCreated]);

  const dismissNewQuery = () => {
    router.replace("/customer");
  };

  if (authLoading && !bypass) {
    return (
      <div id="page-customer-loading" className="page-section active">
        <LaundraRouteLoader title="Your orders" subtitle="Syncing your dashboard…" />
      </div>
    );
  }

  if (!user && !bypass) {
    return (
      <div className="section-pad" style={{ paddingTop: 120, background: "var(--bg)" }}>
        <div className="section-inner">
          <div className="section-label">Customer</div>
          <h2 className="section-title">Dashboard</h2>
          <div className="config-card" style={{ maxWidth: 720 }}>
            <div className="config-title">Sign in required</div>
            <Link className="btn-yellow" href="/login/customer">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!user && bypass) {
    return (
      <div className="section-pad" style={{ paddingTop: 120, background: "var(--bg)" }}>
        <div className="section-inner">
          <div className="section-label animate-in">Customer</div>
          <h2 className="section-title animate-in">
            Your
            <br />
            Orders.
          </h2>
          <div
            className="config-card animate-in"
            style={{
              marginBottom: 18,
              borderColor: "var(--black)",
              background: "var(--yellow)",
            }}
          >
            <div className="config-title">Preview mode</div>
            <p style={{ lineHeight: 1.6, opacity: 0.85 }}>
              Sign-in gate is off. Orders stay empty until you sign in with Supabase.
            </p>
            <Link className="btn-yellow" href="/login/customer" style={{ marginTop: 12 }}>
              Sign in
            </Link>
          </div>
          <div className="config-card animate-in">
            <div className="config-title">Active & History</div>
            <div style={{ opacity: 0.7 }}>No data loaded.</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="section-pad" style={{ paddingTop: 120, background: "var(--bg)" }}>
      <div className="section-inner">
        <div className="section-label animate-in">Customer</div>
        <h2 className="section-title animate-in">
          Your
          <br />
          Orders.
        </h2>

        {acceptBanner && (
          <div
            className="animate-in"
            style={{
              marginBottom: 18,
              border: "4px solid var(--black)",
              background: "var(--yellow)",
              boxShadow: "8px 8px 0 0 var(--black)",
              padding: "16px 18px",
              fontFamily: "Space Grotesk",
              fontWeight: 900,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              fontSize: 13,
            }}
          >
            {acceptBanner}
          </div>
        )}

        {newlyCreated && (
          <div
            style={{
              marginBottom: 22,
              border: "4px solid var(--black)",
              background: highlightBooking?.status === "booking_placed" ? "#d6e3ff" : "white",
              boxShadow: "10px 10px 0 0 var(--primary)",
              padding: "22px 22px 20px",
              scrollMarginTop: 120,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 16,
                flexWrap: "wrap",
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: "Space Grotesk",
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: "var(--primary)",
                    marginBottom: 8,
                  }}
                >
                  Latest booking
                </div>
                {!highlightBooking && (
                  <>
                    <div
                      style={{
                        fontFamily: "Space Grotesk",
                        fontWeight: 900,
                        fontSize: 22,
                        textTransform: "uppercase",
                        letterSpacing: "-0.02em",
                        marginBottom: 10,
                      }}
                    >
                      Syncing your order…
                    </div>
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "10px 14px",
                        border: "3px solid var(--black)",
                        background: "var(--yellow)",
                        fontFamily: "Space Grotesk",
                        fontWeight: 800,
                        fontSize: 11,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                      }}
                    >
                      Connecting to dashboard
                      <span className="loading-dots yellow" aria-hidden="true">
                        <span />
                        <span />
                        <span />
                      </span>
                    </div>
                  </>
                )}
                {highlightBooking && highlightBooking.status === "booking_placed" && (
                  <>
                    <div
                      style={{
                        fontFamily: "Space Grotesk",
                        fontWeight: 900,
                        fontSize: 26,
                        textTransform: "uppercase",
                        letterSpacing: "-0.02em",
                        marginBottom: 12,
                        lineHeight: 1.15,
                      }}
                    >
                      Searching for riders
                    </div>
                    <p style={{ fontFamily: "Inter", lineHeight: 1.55, marginBottom: 14, opacity: 0.9 }}>
                      Hang tight — we&apos;re matching a verified rider near{" "}
                      <strong>{highlightBooking.pickup_city}</strong>. You&apos;ll see updates here the moment someone
                      accepts.
                    </p>
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "12px 16px",
                        border: "3px solid var(--black)",
                        background: "white",
                        boxShadow: "4px 4px 0 0 var(--black)",
                        fontFamily: "Space Grotesk",
                        fontWeight: 800,
                        fontSize: 11,
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                      }}
                    >
                      Matching riders
                      <span className="loading-dots blue" aria-hidden="true">
                        <span />
                        <span />
                        <span />
                      </span>
                    </div>
                  </>
                )}
                {highlightBooking &&
                  (highlightBooking.status === "rider_assigned" ||
                    highlightBooking.status === "rider_arriving") && (
                    <>
                      <div
                        style={{
                          fontFamily: "Space Grotesk",
                          fontWeight: 900,
                          fontSize: 26,
                          textTransform: "uppercase",
                          letterSpacing: "-0.02em",
                          marginBottom: 10,
                          color: "var(--black)",
                        }}
                      >
                        Rider accepted
                      </div>
                      <p style={{ fontFamily: "Inter", lineHeight: 1.55, marginBottom: 0, opacity: 0.9 }}>
                        Your pickup is locked in. Track live progress or book another load anytime.
                      </p>
                    </>
                  )}
                {highlightBooking &&
                  highlightBooking.status !== "booking_placed" &&
                  highlightBooking.status !== "cancelled" &&
                  highlightBooking.status !== "rider_assigned" &&
                  highlightBooking.status !== "rider_arriving" && (
                    <>
                      <div
                        style={{
                          fontFamily: "Space Grotesk",
                          fontWeight: 900,
                          fontSize: 24,
                          textTransform: "uppercase",
                          letterSpacing: "-0.02em",
                          marginBottom: 10,
                        }}
                      >
                        Order in progress
                      </div>
                      <p style={{ fontFamily: "Inter", lineHeight: 1.55, marginBottom: 0, opacity: 0.9 }}>
                        Follow every step from pickup to delivery — track below or open live map.
                      </p>
                    </>
                  )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "stretch" }}>
                <Link className="btn-outline" href="/" style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                  Home
                </Link>
                <Link className="btn-yellow" href="/booking?package=basic" style={{ textAlign: "center" }}>
                  New booking
                </Link>
                <button
                  type="button"
                  className="btn-black"
                  style={{ fontSize: 12, padding: "10px 16px" }}
                  onClick={dismissNewQuery}
                >
                  Dismiss banner
                </button>
              </div>
            </div>
            {highlightBooking && (
              <div
                style={{
                  marginTop: 18,
                  paddingTop: 16,
                  borderTop: "3px solid var(--black)",
                  fontFamily: "Space Grotesk",
                  fontSize: 11,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  opacity: 0.85,
                }}
              >
                {highlightBooking.package_id} · {highlightBooking.service_type.replaceAll("_", " ")} ·{" "}
                {formatLKR(highlightBooking.total_lkr)} · {highlightBooking.scheduled_date}
              </div>
            )}
          </div>
        )}

        <div className="config-card animate-in" id="customer-orders" style={{ scrollMarginTop: 120 }}>
          <div className="config-title">Active & History</div>

          {loading && (
            <div style={{ fontFamily: "Space Grotesk", fontWeight: 800, textTransform: "uppercase", opacity: 0.7 }}>
              Loading…
            </div>
          )}

          {error && (
            <div
              style={{
                color: "var(--red)",
                fontWeight: 800,
                fontFamily: "Space Grotesk",
                textTransform: "uppercase",
              }}
            >
              {error}
            </div>
          )}

          {!loading && !rows.length && (
            <div style={{ opacity: 0.75, lineHeight: 1.6 }}>
              No bookings yet. Create your first pickup booking.
              <div style={{ marginTop: 14 }}>
                <Link className="btn-primary" href="/booking">
                  Book Pickup
                </Link>
              </div>
            </div>
          )}

          {!!rows.length && (
            <div style={{ display: "grid", gap: 14 }}>
              {rows.map((b) => {
                const isWaiting = b.status === "booking_placed";
                const riderLockedIn =
                  b.status === "rider_assigned" || b.status === "rider_arriving";
                return (
                  <div
                    key={b.id}
                    style={{
                      border: "3px solid var(--black)",
                      boxShadow: "4px 4px 0 0 var(--black)",
                      background: newlyCreated === b.id ? "#fffef5" : "white",
                      padding: 16,
                      display: "grid",
                      gridTemplateColumns: "1fr auto",
                      gap: 16,
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontFamily: "Space Grotesk",
                          fontWeight: 900,
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                          marginBottom: 6,
                        }}
                      >
                        {b.package_id} · {b.service_type.replaceAll("_", " ")}
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>
                        {b.pickup_address}, {b.pickup_city}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          opacity: 0.75,
                          marginTop: 4,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                        }}
                      >
                        {b.scheduled_date} · {b.scheduled_window} · {b.status.replaceAll("_", " ")}
                      </div>
                      {isWaiting && (
                        <div
                          style={{
                            marginTop: 10,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 10,
                            padding: "6px 10px",
                            border: "2px solid var(--black)",
                            fontFamily: "Space Grotesk",
                            fontWeight: 800,
                            textTransform: "uppercase",
                            fontSize: 10,
                            letterSpacing: "0.08em",
                            background: "#d6e3ff",
                          }}
                        >
                          Searching riders
                          <span className="loading-dots blue" aria-hidden="true">
                            <span />
                            <span />
                            <span />
                          </span>
                        </div>
                      )}
                      {riderLockedIn && (
                        <div
                          style={{
                            marginTop: 10,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "6px 10px",
                            border: "2px solid var(--black)",
                            fontFamily: "Space Grotesk",
                            fontWeight: 800,
                            textTransform: "uppercase",
                            fontSize: 10,
                            letterSpacing: "0.08em",
                            background: "var(--yellow)",
                          }}
                        >
                          Rider accepted
                        </div>
                      )}
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div
                        style={{
                          fontFamily: "Space Grotesk",
                          fontWeight: 900,
                          fontSize: 22,
                          color: "var(--primary)",
                        }}
                      >
                        {formatLKR(b.total_lkr)}
                      </div>
                      <Link className="btn-outline" href={`/track/${b.id}`} style={{ marginTop: 8, display: "inline-block" }}>
                        Track
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div
          className="config-card animate-in"
          id="customer-settings"
          style={{ marginTop: 24, scrollMarginTop: 120 }}
        >
          <div className="config-title">Account</div>
          <p style={{ margin: 0, lineHeight: 1.6, opacity: 0.85 }}>
            Profile, addresses, and notification preferences will live here.
          </p>
        </div>
      </div>
    </div>
  );
}

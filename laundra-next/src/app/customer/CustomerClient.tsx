"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
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
  const { supabase, user, loading: authLoading } = useSupabaseUser();
  const [rows, setRows] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const search = useSearchParams();
  const newlyCreated = search.get("new");

  const fetchBookings = async () => {
    if (!user || !supabase) return;
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("bookings")
      .select(
        "id,package_id,service_type,pickup_address,pickup_city,scheduled_date,scheduled_window,status,total_lkr,created_at",
      )
      .eq("customer_id", user.id)
      .order("created_at", { ascending: false });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    setRows((data ?? []) as BookingRow[]);
    setLoading(false);
  };

  useEffect(() => {
    if (authLoading) return;
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
        () => fetchBookings(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.id, !!supabase]);

  if (authLoading) return null;

  if (!user) {
    return (
      <div className="section-pad" style={{ paddingTop: 120, background: "var(--bg)" }}>
        <div className="section-inner">
          <div className="section-label">Customer</div>
          <h2 className="section-title">Dashboard</h2>
          <div className="config-card" style={{ maxWidth: 720 }}>
            <div className="config-title">Sign in required</div>
            <Link className="btn-yellow" href="/auth">
              Sign In
            </Link>
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

        {newlyCreated && (
          <div
            className="animate-in"
            style={{
              marginBottom: 18,
              border: "3px solid var(--black)",
              background: "var(--yellow)",
              boxShadow: "6px 6px 0 0 var(--black)",
              padding: "14px 16px",
              fontFamily: "Space Grotesk",
              fontWeight: 900,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Booking placed. Live updates enabled.
          </div>
        )}

        <div className="config-card animate-in">
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
              {rows.map((b) => (
                <div
                  key={b.id}
                  style={{
                    border: "3px solid var(--black)",
                    boxShadow: "4px 4px 0 0 var(--black)",
                    background: "white",
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
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


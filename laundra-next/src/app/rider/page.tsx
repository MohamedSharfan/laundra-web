"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSupabaseUser } from "@/lib/supabase/session";

function formatLKR(amount: number) {
  return `Rs. ${amount.toLocaleString("en-LK")}`;
}

type BookingJob = {
  id: string;
  service_type: string | null;
  pickup_address: string | null;
  pickup_city: string | null;
  total_lkr: number | null;
  scheduled_date: string | null;
  scheduled_window: string | null;
  status: string | null;
};

const RiderOperationsMap = dynamic(() => import("@/components/maps/RiderOperationsMap"), {
  ssr: false,
  loading: () => (
    <div className="map-shell" style={{ padding: 24 }}>
      <div style={{ fontFamily: "Space Grotesk", fontWeight: 800, textTransform: "uppercase" }}>
        Loading map…
      </div>
    </div>
  ),
});

export default function RiderPage() {
  const { supabase, user, profile, loading: authLoading } = useSupabaseUser();
  const router = useRouter();
  const [jobs, setJobs] = useState<BookingJob[]>([]);
  const [accepted, setAccepted] = useState<Record<string, boolean>>({});
  const [accepting, setAccepting] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/auth?role=rider");
      return;
    }
    if (profile?.role === "customer") {
      router.replace("/customer");
    }
  }, [authLoading, user, profile?.role, router]);

  useEffect(() => {
    if (!supabase) return;

    const fetchJobs = async () => {
      setLoading(true);
      setError(null);
      const { data, error: loadError } = await supabase
        .from("bookings")
        .select(
          "id,service_type,pickup_address,pickup_city,total_lkr,scheduled_date,scheduled_window,status",
        )
        .eq("status", "booking_placed")
        .is("rider_id", null)
        .order("created_at", { ascending: false });

      if (loadError) {
        setError(loadError.message);
        setJobs([]);
      } else {
        setJobs((data ?? []) as BookingJob[]);
      }
      setLoading(false);
    };

    fetchJobs();
    const channel = supabase
      .channel("rider-available-bookings")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        () => fetchJobs(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);
  const nearbyOrders = useMemo(
    () =>
      jobs.map((job) => ({
        label: job.service_type ?? "Booking",
        pickup: job.pickup_address ?? "Pickup address pending",
        city: job.pickup_city || "Colombo",
      })),
    [jobs],
  );

  const handleAccept = async (job: BookingJob) => {
    if (!supabase || !user) return;
    setAccepting((prev) => ({ ...prev, [job.id]: true }));
    setError(null);

    const { error: updateError } = await supabase
      .from("bookings")
      .update({ rider_id: user.id, status: "rider_assigned" })
      .eq("id", job.id);

    if (updateError) {
      setError(updateError.message);
      setAccepting((prev) => ({ ...prev, [job.id]: false }));
      return;
    }

    const { error: eventError } = await supabase.from("booking_events").insert({
      booking_id: job.id,
      status: "rider_assigned",
      note: "Rider accepted the booking.",
    });

    if (eventError) {
      setError(eventError.message);
    }

    setAccepted((prev) => ({ ...prev, [job.id]: true }));
    setAccepting((prev) => ({ ...prev, [job.id]: false }));
    setToast("Job accepted successfully.");
  };

  return (
    <div id="page-rider" className="page-section active">
      <div className="dashboard-layout">
        <aside className="sidebar">
          <div className="sidebar-brand">LAUNDRA</div>
          <Link className="sidebar-link" href="/">
            <span className="material-symbols-outlined">arrow_back</span> Back to Site
          </Link>
          <button className="sidebar-link active" type="button">
            <span className="material-symbols-outlined">grid_view</span> Dashboard
          </button>
          <button className="sidebar-link" type="button">
            <span className="material-symbols-outlined">list_alt</span> Available Jobs
          </button>
          <button className="sidebar-link" type="button">
            <span className="material-symbols-outlined">map</span> My Route
          </button>
          <button className="sidebar-link" type="button">
            <span className="material-symbols-outlined">history</span> History
          </button>
          <button className="sidebar-link" type="button">
            <span className="material-symbols-outlined">payments</span> Earnings
          </button>
          <button className="sidebar-link" type="button" style={{ marginTop: "auto" }}>
            <span className="material-symbols-outlined">settings</span> Settings
          </button>
        </aside>

        <main className="dash-main">
          <div className="dash-header">Rider Portal</div>

          {toast && (
            <div
              style={{
                marginBottom: 18,
                border: "3px solid var(--black)",
                background: "var(--yellow)",
                boxShadow: "6px 6px 0 0 var(--black)",
                padding: "12px 16px",
                fontFamily: "Space Grotesk",
                fontWeight: 900,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              {toast}
            </div>
          )}

          {!authLoading && !user && (
            <div
              style={{
                marginBottom: 18,
                border: "3px solid var(--black)",
                background: "#ffe5e5",
                boxShadow: "6px 6px 0 0 var(--black)",
                padding: "12px 16px",
                fontFamily: "Space Grotesk",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Please sign in as a rider to accept jobs.
            </div>
          )}

          {error && (
            <div
              style={{
                marginBottom: 18,
                border: "3px solid var(--black)",
                background: "#ffe5e5",
                boxShadow: "6px 6px 0 0 var(--black)",
                padding: "12px 16px",
                fontFamily: "Space Grotesk",
                fontWeight: 800,
              }}
            >
              {error}
            </div>
          )}

          <div className="stat-grid">
            <div
              className="stat-card"
              style={{
                background: "#d6e3ff",
                borderColor: "var(--primary)",
                boxShadow: "8px 8px 0 0 var(--primary)",
              }}
            >
              <div className="stat-label">Jobs Completed</div>
              <div className="stat-value">124</div>
              <div className="stat-trend">
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: "14px", verticalAlign: "middle" }}
                >
                  trending_up
                </span>{" "}
                +12% this week
              </div>
            </div>
            <div
              className="stat-card"
              style={{
                background: "white",
                borderColor: "var(--black)",
                boxShadow: "8px 8px 0 0 var(--black)",
              }}
            >
              <div className="stat-label">Total Earnings</div>
              <div className="stat-value">{formatLKR(248000)}</div>
              <div className="stat-trend">Payout in 2 days</div>
            </div>
            <div
              className="stat-card"
              style={{
                background: "var(--tertiary)",
                borderColor: "var(--black)",
                boxShadow: "8px 8px 0 0 var(--black)",
                color: "white",
              }}
            >
              <div className="stat-label">Your Rating</div>
              <div className="stat-value">
                4.9<span style={{ fontSize: 24, opacity: 0.5 }}>/5</span>
              </div>
              <div className="stat-trend" style={{ color: "var(--yellow)" }}>
                ★★★★★
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              marginBottom: 24,
              borderBottom: "4px solid var(--primary)",
              paddingBottom: 12,
            }}
          >
            <h3
              style={{
                fontFamily: "Space Grotesk",
                fontSize: 32,
                fontWeight: 900,
                textTransform: "uppercase",
                letterSpacing: "-0.02em",
              }}
            >
              Available Jobs
            </h3>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontFamily: "Space Grotesk",
                fontWeight: 800,
                fontSize: 12,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                opacity: 0.6,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                filter_list
              </span>
              Filter
            </div>
          </div>

          <div style={{ marginBottom: 32 }}>
            <div
              style={{
                fontFamily: "Space Grotesk",
                fontSize: 24,
                fontWeight: 900,
                textTransform: "uppercase",
                letterSpacing: "-0.02em",
                marginBottom: 16,
              }}
            >
              Live Route
            </div>
            <RiderOperationsMap nearbyOrders={nearbyOrders} />
          </div>

          <div className="jobs-grid" id="jobsGrid">
            {loading && (
              <div style={{ fontFamily: "Space Grotesk", fontWeight: 800 }}>
                Loading jobs...
              </div>
            )}
            {!loading && jobs.length === 0 && (
              <div style={{ fontFamily: "Space Grotesk", fontWeight: 800 }}>
                No available jobs right now.
              </div>
            )}
            {jobs.map((job) => {
              const isAccepted = !!accepted[job.id];
              const isAccepting = !!accepting[job.id];
              const shadow = job.status === "booking_placed" ? "shadow-blue" : "shadow-yellow";
              return (
                <div className={`job-card ${shadow}`} key={job.id}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: 16,
                    }}
                  >
                    <div className="job-type-badge">{job.service_type ?? "Laundry"}</div>
                    <div className="job-price">
                      {formatLKR(job.total_lkr ?? 0)}
                    </div>
                  </div>
                  <div className="job-route">
                    <div className="job-point">
                      <div className="job-point-icon">
                        <span
                          className="material-symbols-outlined"
                          style={{ fontVariationSettings: "'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 24" }}
                        >
                          location_on
                        </span>
                      </div>
                      <div>
                        <div className="job-point-label">Pickup</div>
                        <div className="job-point-addr">{job.pickup}</div>
                      </div>
                    </div>
                    <div
                      style={{
                        width: 2,
                        height: 20,
                        background: "var(--primary)",
                          <div className="job-point-addr">
                            {job.pickup_address ?? "Pickup address pending"}
                          </div>
                      }}
                    />
                    <div className="job-point">
                      <div className="job-point-icon" style={{ background: "white" }}>
                        <span className="material-symbols-outlined">inventory_2</span>
                      </div>
                      <div>
                        <div className="job-point-label">Drop-off</div>
                        <div className="job-point-addr">{job.dropoff}</div>
                      </div>
                    </div>
                  </div>
                  <div className="job-actions">
                    <button
                      className="btn-accept"
                      type="button"
                          <div className="job-point-addr">Laundra Hub</div>
                      onClick={() => setAccepted((a) => ({ ...a, [i]: true }))}
                      style={
                        isAccepted

                    {(job.scheduled_date || job.scheduled_window) && (
                      <div
                        style={{
                          marginTop: 12,
                          fontFamily: "Space Grotesk",
                          fontWeight: 800,
                          fontSize: 11,
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          opacity: 0.7,
                        }}
                      >
                        {job.scheduled_date} {job.scheduled_window ? `· ${job.scheduled_window}` : ""}
                      </div>
                    )}

                          ? { background: "#00aa55", cursor: "default", transform: "none" }
                          : undefined
                      }
                    >
                      {isAccepted ? "✓ Accepted!" : "Accept Job"}
                    </button>
                    <button className="btn-details" type="button">
                      Details
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div
            style={{
              marginTop: 48,
                        {job.pickup_city ?? "Colombo"}
              border: "4px solid var(--black)",
              boxShadow: "var(--shadow-yellow)",
              padding: 40,
              display: "grid",
                        onClick={() => handleAccept(job)}
                        disabled={!user || isAccepting || isAccepted}
              gap: 24,
                        {isAccepted ? "Accepted" : isAccepting ? "Accepting..." : "Accept Job"}
            }}
          >
            <div>
              <h3
                style={{
                  fontFamily: "Space Grotesk",
                  fontSize: 32,
                  fontWeight: 900,
                  textTransform: "uppercase",
                  color: "white",
                  marginBottom: 8,
                }}
              >
                Not a Rider Yet?
              </h3>
              <p
                style={{
                  color: "rgba(255,255,255,0.7)",
                  fontSize: 15,
                  lineHeight: 1.6,
                  maxWidth: 480,
                }}
              >
                Join 1,200+ active Laundra riders. Earn flexible income, set your own hours, and
                get weekly automatic payouts.
              </p>
            </div>
            <button className="btn-yellow" type="button" style={{ whiteSpace: "nowrap" }}>
              Join as Rider →
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}


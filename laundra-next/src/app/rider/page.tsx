"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";

function formatLKR(amount: number) {
  return `Rs. ${amount.toLocaleString("en-LK")}`;
}

type Job = {
  type: string;
  price: number;
  pickup: string;
  dropoff: string;
  shadow: "shadow-blue" | "shadow-red" | "shadow-yellow";
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
  const jobs = useMemo<Job[]>(
    () => [
      {
        type: "Express Wash",
        price: 4850,
        pickup: "No. 412, West End Ave, Colombo 03",
        dropoff: "Laundra Hub · Kollupitiya",
        shadow: "shadow-blue",
      },
      {
        type: "Bulk Order",
        price: 8250,
        pickup: "No. 88, Galle Road, Dehiwala",
        dropoff: "Laundra Hub · Dehiwala",
        shadow: "shadow-red",
      },
      {
        type: "Standard",
        price: 3350,
        pickup: "No. 150, Baseline Rd, Borella",
        dropoff: "Laundra Hub · Borella",
        shadow: "shadow-yellow",
      },
      {
        type: "Dry Clean",
        price: 6200,
        pickup: "No. 22, Park St, Colombo 02",
        dropoff: "Laundra Hub · Slave Island",
        shadow: "shadow-blue",
      },
    ],
    [],
  );

  const [accepted, setAccepted] = useState<Record<number, boolean>>({});
  const nearbyOrders = useMemo(
    () =>
      jobs.map((job) => ({
        label: job.type,
        pickup: job.pickup,
        city: job.pickup.split(",").slice(-1)[0]?.trim() || "Colombo",
      })),
    [jobs],
  );

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
            {jobs.map((job, i) => {
              const isAccepted = !!accepted[i];
              return (
                <div className={`job-card ${job.shadow}`} key={i}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: 16,
                    }}
                  >
                    <div className="job-type-badge">{job.type}</div>
                    <div className="job-price">{formatLKR(job.price)}</div>
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
                        marginLeft: 15,
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
                      disabled={isAccepted}
                      onClick={() => setAccepted((a) => ({ ...a, [i]: true }))}
                      style={
                        isAccepted
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
              background: "var(--primary)",
              border: "4px solid var(--black)",
              boxShadow: "var(--shadow-yellow)",
              padding: 40,
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: 24,
              alignItems: "center",
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


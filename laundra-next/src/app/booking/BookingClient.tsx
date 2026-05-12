"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { z } from "zod";
import { useSupabaseUser } from "@/lib/supabase/session";

type Service = "wash" | "iron";

function formatLKR(amount: number) {
  return `Rs. ${amount.toLocaleString("en-LK")}`;
}

export default function BookingClient() {
  const router = useRouter();
  const search = useSearchParams();
  const initialPackage = (search.get("package") ?? "basic") as "basic" | "pro" | "luxury";

  const { supabase, user, loading: authLoading } = useSupabaseUser();

  const [service, setService] = useState<Service>("wash");
  const [weight, setWeight] = useState(12);
  const [addons, setAddons] = useState({
    softener: false,
    hypo: true,
    eco: false,
    scent: false,
    express: false,
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [address, setAddress] = useState("NO. 12, GALLE ROAD, COLOMBO 03");
  const [scheduledDate, setScheduledDate] = useState(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  });
  const [timeWindow, setTimeWindow] = useState("09:00 – 11:00");
  const [city] = useState("Colombo");

  const pricing = useMemo(() => {
    const basePerKg = initialPackage === "pro" ? 650 : service === "wash" ? 450 : 250; // LKR per kg
    const deliveryFee = 1000;

    let total = basePerKg * weight + deliveryFee;
    if (addons.softener) total += 300;
    if (addons.hypo) total += 450;
    if (addons.eco) total += 400;
    if (addons.scent) total += 300;
    if (addons.express) total += initialPackage === "pro" ? 1500 : 1800;

    const serviceName =
      initialPackage === "luxury" ? "Dry Clean" : service === "wash" ? "Wash & Fold" : "Ironing Only";
    const addonNames = Object.entries(addons)
      .filter(([, v]) => v)
      .map(([k]) => k.charAt(0).toUpperCase() + k.slice(1));

    return {
      total,
      serviceName,
      details: `${serviceName} · ${weight}kg` + (addonNames.length ? ` · ${addonNames.join(", ")}` : ""),
      deliveryFee,
    };
  }, [service, weight, addons, initialPackage]);

  const toggleAddon = (name: keyof typeof addons) => {
    setAddons((a) => ({ ...a, [name]: !a[name] }));
  };

  const adjustWeight = (delta: number) => {
    const next = Math.max(1, Math.min(50, weight + delta));
    setWeight(next);
  };

  const bookingSchema = useMemo(
    () =>
      z.object({
        address: z.string().min(8),
        city: z.string().min(2),
        scheduledDate: z.string().min(10),
        timeWindow: z.string().min(5),
        weight: z.number().int().min(1).max(50),
      }),
    [],
  );

  const confirmBooking = async () => {
    setSaveError(null);
    if (authLoading) return;

    if (!user) {
      router.push("/auth");
      return;
    }
    if (!supabase) {
      setSaveError("Supabase is not configured. Create `.env.local` from `.env.example`.");
      return;
    }

    const parsed = bookingSchema.safeParse({
      address,
      city,
      scheduledDate,
      timeWindow,
      weight,
    });
    if (!parsed.success) {
      setSaveError("Please complete pickup details (address, date, and time window).");
      return;
    }

    setSaving(true);
    try {
      const packageId = initialPackage;
      const serviceType = packageId === "luxury" ? "dry_clean" : service === "wash" ? "wash" : "iron";

      const { data: inserted, error } = await supabase
        .from("bookings")
        .insert({
          customer_id: user.id,
          package_id: packageId,
          service_type: serviceType,
          weight_kg: packageId === "luxury" ? null : weight,
          item_count: packageId === "luxury" ? Math.max(1, Math.round(weight / 2)) : null,
          addons,
          pickup_address: address,
          pickup_city: city,
          scheduled_date: scheduledDate,
          scheduled_window: timeWindow,
          total_lkr: pricing.total,
          delivery_fee_lkr: pricing.deliveryFee,
        })
        .select("id")
        .single();

      if (error) throw error;

      await supabase.from("booking_events").insert({
        booking_id: inserted.id,
        status: "booking_placed",
        note: "Booking placed",
        created_by: user.id,
      });

      setModalOpen(true);
      setTimeout(() => router.push(`/customer?new=${inserted.id}`), 900);
    } catch (e: any) {
      setSaveError(e?.message ?? "Booking failed. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div id="page-booking" className="page-section active">
      <div className="dashboard-layout">
        <aside className="sidebar">
          <div className="sidebar-brand">LAUNDRA</div>
          <Link className="sidebar-link" href="/">
            <span className="material-symbols-outlined">arrow_back</span> Back to Site
          </Link>
          <button className="sidebar-link active" type="button">
            <span className="material-symbols-outlined">local_laundry_service</span> New Booking
          </button>
          <button className="sidebar-link" type="button">
            <span className="material-symbols-outlined">map</span> Track Order
          </button>
          <button className="sidebar-link" type="button">
            <span className="material-symbols-outlined">history</span> History
          </button>
          <button className="sidebar-link" type="button">
            <span className="material-symbols-outlined">settings</span> Settings
          </button>
          <button className="sidebar-link" type="button" style={{ marginTop: "auto" }}>
            <span className="material-symbols-outlined">account_circle</span> Profile
          </button>
        </aside>

        <main className="dash-main">
          <div className="dash-header">New Booking</div>

          <div className="booking-grid" style={{ marginBottom: 32 }}>
            <div
              className={`service-card ${service === "wash" ? "selected" : ""}`}
              id="service-wash"
              role="button"
              tabIndex={0}
              onClick={() => setService("wash")}
              onKeyDown={(e) => e.key === "Enter" && setService("wash")}
            >
              <div className="service-num">01</div>
              <span className="material-symbols-outlined service-icon">wash</span>
              <h3 className="service-title">
                Wash &<br />
                Fold
              </h3>
              <p className="service-desc">
                Full laundry cycle: wash, dry, and professional fold. Ready for the drawer.
              </p>
            </div>

            <div
              className={`service-card ${service === "iron" ? "selected" : ""}`}
              id="service-iron"
              role="button"
              tabIndex={0}
              onClick={() => setService("iron")}
              onKeyDown={(e) => e.key === "Enter" && setService("iron")}
            >
              <div className="service-num">02</div>
              <span className="material-symbols-outlined service-icon">iron</span>
              <h3 className="service-title">
                Ironing
                <br />
                Only
              </h3>
              <p className="service-desc">
                Steam-pressed perfection for shirts, trousers, and delicate fabrics.
              </p>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 24, marginBottom: 32 }}>
            <div className="config-card">
              <div className="config-title">Estimated Weight</div>
              <div className="weight-display">
                <div className="weight-num" id="weightDisplay">
                  {weight}
                </div>
                <div className="weight-unit">KG</div>
              </div>
              <input
                type="range"
                min={1}
                max={50}
                value={weight}
                id="weightSlider"
                onChange={(e) => setWeight(parseInt(e.target.value, 10))}
                style={{ marginBottom: 20 }}
                aria-label="Estimated weight"
              />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontFamily: "Space Grotesk",
                  fontWeight: 800,
                  fontSize: 10,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  marginBottom: 20,
                  opacity: 0.5,
                }}
              >
                <span>1 KG</span>
                <span>25 KG</span>
                <span>50 KG</span>
              </div>
              <div className="weight-btns">
                <button className="weight-btn" type="button" onClick={() => adjustWeight(1)}>
                  +1 KG
                </button>
                <button className="weight-btn" type="button" onClick={() => adjustWeight(5)}>
                  +5 KG
                </button>
                <button className="weight-btn minus" type="button" onClick={() => adjustWeight(-1)}>
                  −1 KG
                </button>
                <button className="weight-btn minus" type="button" onClick={() => adjustWeight(-5)}>
                  −5 KG
                </button>
              </div>
            </div>

            <div className="config-card" style={{ background: "var(--black)", color: "white", borderColor: "var(--black)" }}>
              <div className="config-title" style={{ color: "var(--primary-container)", borderBottomColor: "#333" }}>
                Quick Extras
              </div>
              <div className="addon-list">
                <div className="addon-item" onClick={() => toggleAddon("softener")}>
                  <div className="addon-label" style={{ color: "white" }}>
                    Fabric Softener
                  </div>
                  <div className={`addon-check ${addons.softener ? "checked" : ""}`} id="addon-softener" />
                </div>
                <div className="addon-item" onClick={() => toggleAddon("hypo")}>
                  <div className="addon-label" style={{ color: "white" }}>
                    Hypoallergenic
                  </div>
                  <div className={`addon-check ${addons.hypo ? "checked" : ""}`} id="addon-hypo" />
                </div>
                <div className="addon-item" onClick={() => toggleAddon("eco")}>
                  <div className="addon-label" style={{ color: "white" }}>
                    Eco-Friendly
                  </div>
                  <div className={`addon-check ${addons.eco ? "checked" : ""}`} id="addon-eco" />
                </div>
                <div className="addon-item" onClick={() => toggleAddon("scent")}>
                  <div className="addon-label" style={{ color: "white" }}>
                    Scent Boosters
                  </div>
                  <div className={`addon-check ${addons.scent ? "checked" : ""}`} id="addon-scent" />
                </div>
                <div className="addon-item" onClick={() => toggleAddon("express")}>
                  <div className="addon-label" style={{ color: "white" }}>
                    Express 6h +{formatLKR(1500)}
                  </div>
                  <div className={`addon-check ${addons.express ? "checked" : ""}`} id="addon-express" />
                </div>
              </div>
              <div style={{ marginTop: 20, borderTop: "2px solid #333", paddingTop: 16 }}>
                <div
                  className="order-total-label"
                  style={{
                    color: "#888",
                    fontFamily: "Space Grotesk",
                    fontSize: 10,
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                  }}
                >
                  Estimate (incl. delivery {formatLKR(pricing.deliveryFee)})
                </div>
                <div className="order-total" id="priceDisplay">
                  {formatLKR(pricing.total)}
                </div>
              </div>
            </div>
          </div>

          <div className="config-card">
            <div className="config-title">Pickup Details</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
              <div>
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
                  Address
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="NO. 12, GALLE ROAD, COLOMBO 03"
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
                  }}
                />
              </div>
              <div>
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
                  Date
                </label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  style={{
                    width: "100%",
                    border: "3px solid var(--black)",
                    padding: "12px 14px",
                    fontFamily: "Space Grotesk",
                    fontWeight: 700,
                    fontSize: 13,
                    outline: "none",
                    background: "white",
                  }}
                />
              </div>
              <div>
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
                  Time Window
                </label>
                <select
                  value={timeWindow}
                  onChange={(e) => setTimeWindow(e.target.value)}
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
                  }}
                >
                  <option>09:00 – 11:00</option>
                  <option>11:00 – 13:00</option>
                  <option>13:00 – 15:00</option>
                  <option>15:00 – 17:00</option>
                  <option>17:00 – 19:00</option>
                </select>
              </div>
            </div>
          </div>

          <div className="order-summary">
            <div>
              <div className="order-total-label">Total Estimate</div>
              <div className="order-total" id="summaryPrice">
                {formatLKR(pricing.total)}
              </div>
              <div className="order-details" id="summaryDetails">
                {pricing.details}
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button
                className="btn-outline"
                type="button"
                style={{ color: "white", borderColor: "white", boxShadow: "4px 4px 0 0 white" }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ verticalAlign: "middle", marginRight: 6, fontSize: "18px" }}
                >
                  schedule
                </span>
                Set Pickup Time
              </button>
              <button
                className="btn-yellow"
                type="button"
                style={{ fontSize: 14, opacity: saving ? 0.7 : 1 }}
                onClick={confirmBooking}
                disabled={saving}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ verticalAlign: "middle", marginRight: 6, fontSize: "18px" }}
                >
                  check_circle
                </span>
                {saving ? "Confirming..." : "Confirm Booking"}
              </button>
            </div>
          </div>

          {saveError && (
            <div
              style={{
                marginTop: 18,
                border: "3px solid var(--black)",
                background: "#fff",
                boxShadow: "4px 4px 0 0 var(--black)",
                padding: "14px 16px",
                maxWidth: 840,
                color: "var(--red)",
                fontWeight: 800,
                fontFamily: "Space Grotesk",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              {saveError}
            </div>
          )}

          <div
            id="bookingModal"
            style={{
              display: modalOpen ? "flex" : "none",
              position: "fixed",
              inset: 0,
              zIndex: 1000,
              background: "rgba(0,0,0,0.7)",
              alignItems: "center",
              justifyContent: "center",
            }}
            role="dialog"
            aria-modal="true"
          >
            <div
              style={{
                background: "var(--yellow)",
                border: "4px solid var(--black)",
                boxShadow: "12px 12px 0 0 var(--black)",
                padding: 48,
                maxWidth: 480,
                width: "90%",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 64, marginBottom: 16 }}>✓</div>
              <h3
                style={{
                  fontFamily: "Space Grotesk",
                  fontSize: 40,
                  fontWeight: 900,
                  textTransform: "uppercase",
                  marginBottom: 12,
                }}
              >
                Booking Confirmed!
              </h3>
              <p style={{ fontSize: 16, marginBottom: 24 }}>
                Your rider will arrive during your chosen window. Track in real-time on the app.
              </p>
              <div style={{ fontFamily: "Space Grotesk", fontSize: 28, fontWeight: 900, marginBottom: 24 }}>
                Order created successfully.
              </div>
              <button
                className="btn-black"
                type="button"
                onClick={() => setModalOpen(false)}
                style={{ fontSize: 14, width: "100%", textAlign: "center" }}
              >
                Done
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}


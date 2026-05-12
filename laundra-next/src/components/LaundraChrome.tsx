"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLaundraRuntime } from "./useLaundraRuntime";
import { isAuthBypassEnabled } from "@/lib/auth-bypass";
import { useSupabaseUser } from "@/lib/supabase/session";

export default function LaundraChrome({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { profile, loading: authLoading } = useSupabaseUser();
  const isRider = profile?.role === "rider";
  const hideRiderNav = profile?.role === "customer";
  const hideCustomerNav = profile?.role === "rider";
  const bypass = isAuthBypassEnabled();

  const activeNav = useMemo(() => {
    if (pathname === "/booking") return "booking";
    if (pathname === "/rider") return "rider";
    if (pathname === "/customer") return "customer";
    if (pathname.startsWith("/login/") || pathname === "/auth") return "auth";
    if (pathname.startsWith("/admin")) return "admin";
    if (pathname.startsWith("/track")) return "track";
    return "home";
  }, [pathname]);

  const marketingActive = activeNav === "home";

  useLaundraRuntime(pathname);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const isTyping =
        !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT");
      if (!isTyping && e.key === "b") {
        if (!authLoading && profile?.role === "rider") router.push("/rider");
        else router.push("/booking?package=basic");
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [router, authLoading, profile?.role]);

  const closeMenu = () => setMobileMenuOpen(false);

  return (
    <>
      <div id="loader">
        <div className="loader-logo">LAUNDRA</div>
        <div className="loader-bar-track">
          <div className="loader-bar" id="loaderBar" />
        </div>
        <div className="loader-tagline">Calibrating the clean</div>
      </div>

      <div className="scroll-indicator" id="scrollIndicator" />

      <nav
        className={`main-nav ${mobileMenuOpen ? "menu-open" : ""}`}
        id="mainNav"
      >
        <Link className="nav-logo hover-line" href="/" onClick={closeMenu}>
          LAUNDRA
        </Link>
        <button
          type="button"
          className="hamburger"
          aria-expanded={mobileMenuOpen}
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          onClick={() => setMobileMenuOpen((o) => !o)}
        />
        <div className="nav-middle">
          <div className="nav-links">
            <Link className={marketingActive ? "active" : ""} href="/#process" onClick={closeMenu}>
              How It Works
            </Link>
            <Link className={marketingActive ? "active" : ""} href="/#features" onClick={closeMenu}>
              Services
            </Link>
            <Link className={marketingActive ? "active" : ""} href="/#pricing" onClick={closeMenu}>
              Pricing
            </Link>
            <Link className={marketingActive ? "active" : ""} href="/#faq" onClick={closeMenu}>
              FAQ
            </Link>
            {!hideCustomerNav && (
              <Link
                className={activeNav === "customer" ? "active" : ""}
                href="/customer"
                prefetch
                onClick={closeMenu}
              >
                Track orders
              </Link>
            )}
            {!hideRiderNav && (
              <Link className={activeNav === "rider" ? "active" : ""} href="/rider" prefetch onClick={closeMenu}>
                Rider Portal
              </Link>
            )}
            <Link
              className={activeNav === "booking" ? "active" : ""}
              href="/booking?package=basic"
              prefetch
              onClick={closeMenu}
            >
              Book
            </Link>
            <Link
              className={activeNav === "auth" ? "active" : ""}
              href="/login/customer"
              onClick={closeMenu}
            >
              Sign in
            </Link>
          </div>
          <div className="nav-cta">
            <Link
              className="btn-outline"
              href={isRider ? "/customer" : "/login/rider"}
              onClick={closeMenu}
            >
              {isRider ? "Customer dashboard" : "Become a Rider"}
            </Link>
            <Link
              className="btn-primary"
              href={isRider ? "/rider" : "/booking?package=basic"}
              onClick={closeMenu}
            >
              {isRider ? "Rider Portal" : "Book Pickup"}
            </Link>
          </div>
        </div>
      </nav>

      <div id="app">{children}</div>

      <nav className="mobile-nav" aria-label="Primary">
        <Link
          className={`mobile-nav-item ${activeNav === "home" ? "active" : ""}`}
          id="mobileHome"
          href="/"
        >
          <span className="material-symbols-outlined">home</span>Home
        </Link>
        <Link
          className={`mobile-nav-item ${activeNav === "booking" ? "active" : ""}`}
          id="mobileBook"
          href="/booking?package=basic"
          prefetch
        >
          <span className="material-symbols-outlined">add_box</span>Book
        </Link>
        {!hideRiderNav && (
          <Link
            className={`mobile-nav-item ${activeNav === "rider" ? "active" : ""}`}
            id="mobileRider"
            href="/rider"
            prefetch
          >
            <span className="material-symbols-outlined">two_wheeler</span>Rider
          </Link>
        )}
        {!hideCustomerNav && (
          <Link
            className={`mobile-nav-item ${activeNav === "customer" ? "active" : ""}`}
            id="mobileTrack"
            href="/customer"
            prefetch
          >
            <span className="material-symbols-outlined">route</span>Track
          </Link>
        )}
        <Link
          className={`mobile-nav-item ${activeNav === "auth" ? "active" : ""}`}
          id="mobileSignIn"
          href="/login/customer"
        >
          <span className="material-symbols-outlined">login</span>Sign in
        </Link>
      </nav>

      {bypass && (
        <div
          style={{
            position: "fixed",
            bottom: 72,
            left: 8,
            right: 8,
            zIndex: 190,
            pointerEvents: "none",
            fontFamily: "Space Grotesk",
            fontSize: 10,
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            textAlign: "center",
            opacity: 0.85,
          }}
        >
          <span
            style={{
              display: "inline-block",
              background: "var(--yellow)",
              border: "2px solid var(--black)",
              padding: "6px 10px",
              pointerEvents: "auto",
            }}
          >
            SKIP_AUTH preview
          </span>
        </div>
      )}
    </>
  );
}

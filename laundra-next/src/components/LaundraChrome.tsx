"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLaundraRuntime } from "./useLaundraRuntime";
import { useSupabaseUser } from "@/lib/supabase/session";

export default function LaundraChrome({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile } = useSupabaseUser();
  const isRider = profile?.role === "rider";

  const active = useMemo(() => {
    if (pathname === "/booking") return "booking";
    if (pathname === "/rider") return "rider";
    return "home";
  }, [pathname]);

  useLaundraRuntime();

  useEffect(() => {
    // Keyboard shortcut (from original HTML): "b" opens booking
    const onKeyDown = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const isTyping =
        !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT");
      if (!isTyping && e.key === "b") router.push("/booking");
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [router]);

  return (
    <>
      {/* LOADING SCREEN */}
      <div id="loader">
        <div className="loader-logo">LAUNDRA</div>
        <div className="loader-bar-track">
          <div className="loader-bar" id="loaderBar" />
        </div>
        <div className="loader-tagline">Calibrating the clean</div>
      </div>

      {/* SCROLL PROGRESS */}
      <div className="scroll-indicator" id="scrollIndicator" />

      {/* NAV */}
      <nav className="main-nav" id="mainNav">
        <Link className="nav-logo hover-line" href="/">
          LAUNDRA
        </Link>
        <div className="nav-links">
          <Link className={`nav-link ${active === "home" ? "active" : ""}`} href="/#process">
            How It Works
          </Link>
          <Link className={`nav-link ${active === "home" ? "active" : ""}`} href="/#features">
            Services
          </Link>
          <Link className={`nav-link ${active === "home" ? "active" : ""}`} href="/#pricing">
            Pricing
          </Link>
          <Link className={`nav-link ${active === "rider" ? "active" : ""}`} href="/rider">
            Rider Portal
          </Link>
        </div>
        <div className="nav-cta">
          <Link className="btn-outline" href={isRider ? "/customer" : "/auth?role=rider"}>
            {isRider ? "Customer Dashboard" : "Become a Rider"}
          </Link>
          <Link className="btn-primary" href={isRider ? "/rider" : "/booking?package=basic"}>
            {isRider ? "Rider Portal" : "Book Pickup"}
          </Link>
        </div>
        <div className="hamburger" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </nav>

      {/* APP WRAPPER (keeps original opacity transition hooks) */}
      <div id="app">
        {children}
      </div>

      {/* MOBILE BOTTOM NAV */}
      <nav className="mobile-nav" aria-label="Primary">
        <Link
          className={`mobile-nav-item ${active === "home" ? "active" : ""}`}
          id="mobileHome"
          href="/"
        >
          <span className="material-symbols-outlined">home</span>Home
        </Link>
        <Link
          className={`mobile-nav-item ${active === "booking" ? "active" : ""}`}
          id="mobileBook"
          href="/booking?package=basic"
        >
          <span className="material-symbols-outlined">add_box</span>Book
        </Link>
        <Link
          className={`mobile-nav-item ${active === "rider" ? "active" : ""}`}
          id="mobileRider"
          href="/rider"
        >
          <span className="material-symbols-outlined">two_wheeler</span>Rider
        </Link>
        <Link className="mobile-nav-item" id="mobileTrack" href="/customer">
          <span className="material-symbols-outlined">route</span>Track
        </Link>
      </nav>
    </>
  );
}


"use client";

import { useEffect } from "react";

let scrollRevealObserver: IntersectionObserver | null = null;

function disconnectScrollReveal() {
  scrollRevealObserver?.disconnect();
  scrollRevealObserver = null;
}

/** Observe scroll reveals + immediately show elements already in the viewport (fixes /#process and client navigations). */
export function wireHomeScrollAnimations() {
  disconnectScrollReveal();

  scrollRevealObserver = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          (e.target as HTMLElement).classList.add("visible");
          obs.unobserve(e.target);
        }
      });
    },
    { threshold: 0.06, rootMargin: "0px 0px 12% 0px" },
  );

  document.querySelectorAll(".animate-in, .animate-in-left").forEach((el) => {
    scrollRevealObserver!.observe(el);
  });

  const revealNow = () => {
    const vh = window.innerHeight || document.documentElement.clientHeight;
    document.querySelectorAll(".animate-in:not(.visible), .animate-in-left:not(.visible)").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.top < vh + 120 && r.bottom > -60) {
        (el as HTMLElement).classList.add("visible");
        scrollRevealObserver?.unobserve(el);
      }
    });
  };

  requestAnimationFrame(() => {
    revealNow();
    requestAnimationFrame(revealNow);
  });
}

function animateHeroStats() {
  const targets = [
    { id: "stat1", target: 50, suffix: "K+" },
    { id: "stat2", target: 120, suffix: "K+" },
    { id: "stat3", target: 1200, suffix: "+" },
  ];

  targets.forEach(({ id, target, suffix }) => {
    const el = document.getElementById(id);
    if (!el) return;
    let count = 0;
    const step = Math.ceil(target / 60);
    const interval = window.setInterval(() => {
      count = Math.min(count + step, target);
      el.textContent = count.toLocaleString() + suffix;
      if (count >= target) window.clearInterval(interval);
    }, 25);
  });
}

export function useLaundraRuntime(pathname: string) {
  useEffect(() => {
    const loaderBar = document.getElementById("loaderBar") as HTMLElement | null;
    const loader = document.getElementById("loader");
    const app = document.getElementById("app");

    const showApp = () => {
      if (loaderBar) loaderBar.style.width = "100%";
      loader?.classList.add("hidden");
      app?.classList.add("visible");
    };

    const onLoad = () => {
      window.setTimeout(() => {
        showApp();
        window.setTimeout(() => {
          if (window.location.pathname === "/") {
            wireHomeScrollAnimations();
            animateHeroStats();
          }
        }, 300);
      }, 1800);
    };

    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad);

    let lastScroll = 0;
    const onScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      const ind = document.getElementById("scrollIndicator") as HTMLElement | null;
      if (ind) ind.style.width = `${pct}%`;

      const nav = document.getElementById("mainNav");
      if (nav) {
        if (scrollTop > lastScroll && scrollTop > 200) nav.classList.add("hide");
        else nav.classList.remove("hide");
      }
      lastScroll = scrollTop;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("load", onLoad);
    };
  }, []);

  useEffect(() => {
    const app = document.getElementById("app");
    const loader = document.getElementById("loader");
    app?.classList.add("visible");
    loader?.classList.add("hidden");

    if (pathname !== "/") {
      disconnectScrollReveal();
      return;
    }

    const tryWireHome = () => {
      const app = document.getElementById("app");
      if (!app?.classList.contains("visible")) return false;
      wireHomeScrollAnimations();
      animateHeroStats();
      return true;
    };

    if (tryWireHome()) {
      return () => disconnectScrollReveal();
    }

    const iv = window.setInterval(() => {
      if (tryWireHome()) window.clearInterval(iv);
    }, 100);
    const maxWait = window.setTimeout(() => window.clearInterval(iv), 5000);

    return () => {
      window.clearInterval(iv);
      window.clearTimeout(maxWait);
      disconnectScrollReveal();
    };
  }, [pathname]);
}

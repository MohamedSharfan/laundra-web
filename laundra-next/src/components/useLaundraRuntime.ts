"use client";

import { useEffect } from "react";

export function useLaundraRuntime() {
  useEffect(() => {
    const loaderBar = document.getElementById("loaderBar") as HTMLElement | null;
    const loader = document.getElementById("loader");
    const app = document.getElementById("app");

    const initAnimations = () => {
      const observer = new IntersectionObserver(
        (entries, obs) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              (e.target as HTMLElement).classList.add("visible");
              obs.unobserve(e.target);
            }
          });
        },
        { threshold: 0.1 },
      );

      document
        .querySelectorAll(".animate-in, .animate-in-left")
        .forEach((el) => observer.observe(el));
    };

    const animateStats = () => {
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
    };

    // Loader: mimic original behavior closely
    const onLoad = () => {
      if (loaderBar) loaderBar.style.width = "100%";
      window.setTimeout(() => {
        loader?.classList.add("hidden");
        app?.classList.add("visible");
        window.setTimeout(initAnimations, 300);
        window.setTimeout(animateStats, 800);
      }, 1800);
    };

    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad);

    // Scroll indicator + nav hide/reveal (original)
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
}


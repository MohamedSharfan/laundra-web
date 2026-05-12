import { Suspense } from "react";
import MagicLinkAuth from "@/components/auth/MagicLinkAuth";

function LoginFallback() {
  return (
    <div
      className="section-pad"
      style={{
        paddingTop: 120,
        background: "var(--bg)",
        fontFamily: "Space Grotesk",
        fontWeight: 800,
        textTransform: "uppercase",
      }}
    >
      Loading…
    </div>
  );
}

export default function RiderLoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <MagicLinkAuth fixedRole="rider" />
    </Suspense>
  );
}

import { Suspense } from "react";
import dynamic from "next/dynamic";

const CustomerTrackingMap = dynamic(() => import("@/components/maps/CustomerTrackingMap"), {
  ssr: false,
  loading: () => (
    <div className="map-shell" style={{ padding: 24 }}>
      <div style={{ fontFamily: "Space Grotesk", fontWeight: 800, textTransform: "uppercase" }}>
        Loading map…
      </div>
    </div>
  ),
});

type Props = {
  params: { id: string };
};

export default function TrackPage({ params }: Props) {
  return (
    <div className="section-pad" style={{ paddingTop: 120, background: "var(--bg)" }}>
      <div className="section-inner">
        <div className="section-label">Live Tracking</div>
        <h2 className="section-title">Your Delivery</h2>
        <Suspense>
          <CustomerTrackingMap bookingId={params.id} />
        </Suspense>
      </div>
    </div>
  );
}

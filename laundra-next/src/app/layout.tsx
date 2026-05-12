import type { Metadata } from "next";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import LaundraChrome from "@/components/LaundraChrome";

export const metadata: Metadata = {
  title: "LAUNDRA — Clean. Bold. Precise.",
  description:
    "Professional laundry pickup & delivery. Wash, iron, repeat. Book in seconds.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700;800;900&family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <LaundraChrome>{children}</LaundraChrome>
      </body>
    </html>
  );
}

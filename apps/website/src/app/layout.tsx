import type { Metadata } from "next";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import "./globals.css";

export const metadata: Metadata = {
  title: "BroBlox – Games by Two Bros",
  description:
    "BroBlox is an indie Roblox game studio. Two brothers building free-to-play games with leaderboards, achievements, and live events.",
  metadataBase: new URL("https://broblox-games.com"),
  openGraph: {
    title: "BroBlox – Games by Two Bros",
    description: "Free-to-play Roblox games by BroBlox studio.",
    url: "https://broblox-games.com",
    siteName: "BroBlox",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "BroBlox – Games by Two Bros",
    description: "Free-to-play Roblox games by BroBlox studio.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#08080f] text-[#fafafa] antialiased">
        <Nav />
        {children}
        <Footer />
      </body>
    </html>
  );
}

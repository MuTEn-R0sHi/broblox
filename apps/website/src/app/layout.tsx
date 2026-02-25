import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

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
    images: [{ url: "/logo.png", width: 500, height: 500 }],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "BroBlox – Games by Two Bros",
    description: "Free-to-play Roblox games by BroBlox studio.",
    images: ["/logo.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-background text-foreground antialiased`}>
        <Nav />
        {children}
        <Footer />
      </body>
    </html>
  );
}

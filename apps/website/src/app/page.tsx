import { Hero } from "@/components/hero";
import { Games } from "@/components/games";
import { Features } from "@/components/features";
import { Stats } from "@/components/stats";

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-x-hidden">
      <Hero />
      <Games />
      <Features />
      <Stats />
    </main>
  );
}

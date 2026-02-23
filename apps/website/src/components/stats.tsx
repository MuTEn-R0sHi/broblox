"use client";

import { useEffect, useRef, useState } from "react";

interface StatItem {
  label: string;
  value: number;
  suffix: string;
  accent: "cyan" | "purple";
}

const stats: StatItem[] = [
  { label: "Games", value: 2, suffix: "", accent: "cyan" },
  { label: "Players", value: 500, suffix: "+", accent: "purple" },
  { label: "Achievements", value: 50, suffix: "+", accent: "cyan" },
  { label: "Updates", value: 12, suffix: "+", accent: "purple" },
];

function Counter({ end, suffix }: { end: number; suffix: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const duration = 1200;
          const startTime = performance.now();
          const tick = (now: number) => {
            const progress = Math.min((now - startTime) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(eased * end));
            if (progress < 1) requestAnimationFrame(tick);
            else setCount(end);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end]);

  return (
    <span ref={ref}>
      {count}
      {suffix}
    </span>
  );
}

export function Stats() {
  return (
    <section className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-4xl grid-cols-2 gap-6 sm:grid-cols-4">
        {stats.map((s) => {
          const isCyan = s.accent === "cyan";
          const accentColor = isCyan ? "#00e5ff" : "#c084fc";
          const accentBg = isCyan ? "#00e5ff08" : "#c084fc08";
          const accentBorder = isCyan ? "#00e5ff22" : "#c084fc22";

          return (
            <div
              key={s.label}
              className="flex flex-col items-center gap-1 rounded-2xl border p-6 text-center"
              style={{ borderColor: accentBorder, backgroundColor: accentBg }}
            >
              <span
                className="text-4xl font-black tabular-nums sm:text-5xl"
                style={{
                  color: accentColor,
                  textShadow: `0 0 16px ${accentColor}66`,
                }}
              >
                <Counter end={s.value} suffix={s.suffix} />
              </span>
              <span className="text-xs font-semibold uppercase tracking-widest text-[#52525b]">
                {s.label}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/** Mock for next/font/google — returns a no-op font object for vitest */
export function Inter() {
  return { className: "mock-inter", style: { fontFamily: "Inter" } };
}

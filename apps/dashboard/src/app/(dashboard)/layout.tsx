import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { SessionProvider } from "next-auth/react";
import { getCsrfToken } from "@/lib/csrf";
import type { ReactNode } from "react";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  // Ensure a CSRF cookie is set for the session — the cookie itself is
  // readable by client-side JS so it can be sent as a header (double-submit
  // pattern). Validation compares the cookie value to the x-csrf-token header.
  await getCsrfToken();

  return (
    <SessionProvider session={session}>
      <div className="flex h-screen">
        <Sidebar user={session.user} />
        <main className="flex-1 overflow-auto">
          <div className="p-8">{children}</div>
        </main>
      </div>
    </SessionProvider>
  );
}

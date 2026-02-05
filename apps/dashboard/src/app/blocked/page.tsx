import Link from "next/link";

export default function BlockedPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-12">
      <h1 className="text-2xl font-semibold">Access restricted</h1>
      <p className="mt-3 text-sm text-slate-600">
        This dashboard is restricted by IP allowlist. If you believe you should have access, ask an
        admin to update{" "}
        <code className="rounded bg-slate-100 px-1 py-0.5">DASHBOARD_ALLOWED_IPS</code>.
      </p>
      <div className="mt-6 flex gap-3">
        <Link
          href="/login"
          className="inline-flex items-center rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white"
        >
          Back to login
        </Link>
        <Link
          href="/"
          className="inline-flex items-center rounded-md border border-slate-300 px-3 py-2 text-sm font-medium"
        >
          Home
        </Link>
      </div>
    </main>
  );
}

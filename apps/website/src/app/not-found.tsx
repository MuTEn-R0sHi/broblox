import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-6 px-6 py-20 text-center">
      <div className="space-y-2">
        <h1 className="text-7xl font-bold tracking-tight text-white">404</h1>
        <p className="text-lg text-gray-400">We couldn&apos;t find what you were looking for.</p>
      </div>
      <Link
        href="/"
        className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
      >
        Back to home
      </Link>
    </main>
  );
}

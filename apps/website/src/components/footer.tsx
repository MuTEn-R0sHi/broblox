import Image from "next/image";

export function Footer() {
  return (
    <footer className="relative border-t border-[#1e1e3a] px-4 py-12 sm:px-6 lg:px-8">
      {/* Glow line */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#00e5ff44] to-[#c084fc44]" />

      <div className="mx-auto flex max-w-5xl flex-col items-center gap-8">
        {/* Logo + name */}
        <div className="flex flex-col items-center gap-3">
          <Image src="/logo.png" alt="BroBlox" width={72} height={72} />
          <span className="shimmer-text text-xl font-black">BroBlox</span>
          <p className="text-xs text-[#52525b]">Two bros. Building Roblox games.</p>
        </div>

        {/* Links */}
        <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-[#71717a]">
          <a
            href="https://dashboard.broblox-games.com"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-[#00e5ff]"
          >
            Dashboard
          </a>
          <a
            href="https://docs.broblox-games.com"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-[#00e5ff]"
          >
            Docs
          </a>
          <a
            href="https://github.com/MuTEn-R0sHi/broblox"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-[#c084fc]"
          >
            GitHub
          </a>
          <a
            href="https://www.roblox.com"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-[#c084fc]"
          >
            Play on Roblox
          </a>
        </nav>

        {/* Copyright */}
        <p className="text-xs text-[#3f3f60]">
          © {new Date().getFullYear()} BroBlox. Not affiliated with Roblox Corporation.
        </p>
      </div>
    </footer>
  );
}

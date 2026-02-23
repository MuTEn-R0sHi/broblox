"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Flag,
  Users,
  UserCog,
  Shield,
  FileText,
  Settings,
  LogOut,
  Trophy,
  Gamepad2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "next-auth/react";
import { hasPermission, type Permission, type Role } from "@/lib/rbac";

const navigation: Array<{
  name: string;
  href: string;
  icon: typeof LayoutDashboard;
  permission: Permission;
}> = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard, permission: "view:dashboard" },
  { name: "Games", href: "/games", icon: Gamepad2, permission: "games:view" },
  { name: "Matches", href: "/matches", icon: Trophy, permission: "view:matches" },
  { name: "Feature Flags", href: "/flags", icon: Flag, permission: "view:flags" },
  { name: "Players", href: "/players", icon: Users, permission: "view:players" },
  {
    name: "Moderation",
    href: "/moderation",
    icon: Shield,
    permission: "moderation:view",
  },
  { name: "Audit Log", href: "/audit", icon: FileText, permission: "view:audit" },
  { name: "Users", href: "/users", icon: UserCog, permission: "users:view" },
  { name: "Settings", href: "/settings", icon: Settings, permission: "settings:view" },
];

interface SidebarProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: Role | null;
  };
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const role = user.role ?? "VIEWER";

  return (
    <div className="flex h-full w-64 flex-col bg-sidebar-background border-r border-sidebar-border">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-6">
        <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
          <span className="text-primary-foreground font-bold text-sm">BBX</span>
        </div>
        <span className="font-semibold text-sidebar-foreground">BroBlox</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation
          .filter((item) => hasPermission(role, item.permission))
          .map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
      </nav>

      {/* User */}
      <div className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          {user.image ? (
            <img src={user.image} alt={user.name ?? "User"} className="h-9 w-9 rounded-full" />
          ) : (
            <div className="h-9 w-9 rounded-full bg-sidebar-accent flex items-center justify-center">
              <span className="text-sm font-medium">{user.name?.charAt(0) ?? "?"}</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">{user.name}</p>
            <p className="text-xs text-sidebar-foreground/60 truncate">{user.email}</p>
          </div>
          <button
            onClick={() => signOut()}
            className="p-2 rounded-lg hover:bg-sidebar-accent text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

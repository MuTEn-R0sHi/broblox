import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./db";
import { auditLogin } from "./audit";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    GitHub({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
  ],
  events: {
    async signIn({ user }) {
      if (user.id) {
        await auditLogin(user.id);
      }
    },
  },
  callbacks: {
    async session({ session, user }) {
      // Add user ID and role to session
      if (session.user) {
        session.user.id = user.id;
        session.user.role = user.role;
      }
      return session;
    },
    async signIn({ user: _user, profile }) {
      // Optional: Restrict to specific GitHub users
      const allowedUsersEnv = process.env.ALLOWED_GITHUB_USERS?.trim();
      if (allowedUsersEnv && allowedUsersEnv.length > 0 && profile?.login) {
        const allowedUsers = allowedUsersEnv.split(",").map((u) => u.trim());
        return allowedUsers.includes(profile.login as string);
      }

      // Optional: Bootstrap admin role via env var (comma-separated GitHub usernames).
      // This avoids getting stuck with a default VIEWER user and no way to grant roles.
      const adminUsersEnv = process.env.ADMIN_GITHUB_USERS?.trim();
      if (adminUsersEnv && adminUsersEnv.length > 0 && profile?.login && _user.id) {
        const adminUsers = adminUsersEnv.split(",").map((u) => u.trim());
        if (adminUsers.includes(profile.login as string)) {
          try {
            await prisma.user.update({
              where: { id: _user.id },
              data: { role: "ADMIN" },
            });
          } catch (error) {
            console.error("Failed to bootstrap ADMIN role for user", _user.id, error);
          }
        }
      }
      return true;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
});

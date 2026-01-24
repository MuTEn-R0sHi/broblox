import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./db";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    GitHub({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      // Add user ID and role to session
      if (session.user) {
        session.user.id = user.id;
        // @ts-expect-error - role is added by Prisma adapter
        session.user.role = user.role;
      }
      return session;
    },
    async signIn({ user, profile }) {
      // Optional: Restrict to specific GitHub users
      const allowedUsersEnv = process.env.ALLOWED_GITHUB_USERS?.trim();
      if (allowedUsersEnv && allowedUsersEnv.length > 0 && profile?.login) {
        const allowedUsers = allowedUsersEnv.split(",").map((u) => u.trim());
        return allowedUsers.includes(profile.login as string);
      }
      return true;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
});

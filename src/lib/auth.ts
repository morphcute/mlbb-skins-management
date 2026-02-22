import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { getServerSession, NextAuthOptions, type Session } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validators";

export const ROLE_HOME: Record<Role, string> = {
  ADMIN: "/admin/dashboard",
  SUPPLIER: "/supplier/dashboard",
  VIEWER: "/viewer/dashboard",
};

export const authOptions: NextAuthOptions = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  providers: [
    CredentialsProvider({
      name: "Email and Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email.toLowerCase() },
        });

        if (!user) {
          return null;
        }

        const passwordMatches = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!passwordMatches) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.role = (user as { role: Role }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string;
        session.user.role = token.role as Role;
      }
      return session;
    },
  },
};

export function getHomeRouteByRole(role: Role) {
  return ROLE_HOME[role] ?? "/login";
}

export async function getAuthSession() {
  return getServerSession(authOptions);
}

export async function requireSession(): Promise<Session> {
  const session = await getAuthSession();

  if (!session?.user) {
    redirect("/login");
  }

  return session;
}

export async function requireRole(allowedRoles: Role[]): Promise<Session> {
  const session = await requireSession();
  const role = session.user.role;

  if (!allowedRoles.includes(role)) {
    redirect(getHomeRouteByRole(role));
  }

  return session;
}

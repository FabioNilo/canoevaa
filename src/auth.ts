import bcrypt from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";

const fallbackAdminEmail = process.env.ADMIN_EMAIL ?? "admin@ilheus.local";
const fallbackAdminPassword = process.env.ADMIN_PASSWORD ?? "admin123";

export const authOptions: NextAuthOptions = {
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/associado/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credenciais",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password ?? "";

        if (!email || !password) {
          return null;
        }

        if (prisma) {
          const user = await prisma.user.findUnique({ where: { email } });
          const passwordMatches = user?.passwordHash
            ? await bcrypt.compare(password, user.passwordHash)
            : false;

          if (user?.active && passwordMatches) {
            if (user.role === "ADMIN") {
              return { id: user.id, name: user.name, email: user.email, role: "admin" };
            }

            if (user.role === "MEMBER") {
              return { id: user.id, name: user.name, email: user.email, role: "member" };
            }
          }
        }

        if (email === fallbackAdminEmail.toLowerCase() && password === fallbackAdminPassword) {
          return { id: "fallback_admin", name: "Administrador", email, role: "admin" };
        }

        return null;
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = user.role;
      }

      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = token.role === "admin" || token.role === "member" ? token.role : "public";
      }

      return session;
    },
  },
};

import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "public" | "member" | "admin";
    } & DefaultSession["user"];
  }

  interface User {
    role: "public" | "member" | "admin";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "public" | "member" | "admin";
  }
}

import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role?: "ADMIN" | "OWNER" | "MANAGER" | "EMPLOYEE" | "USER";
      tenantId?: string;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role?: "ADMIN" | "OWNER" | "MANAGER" | "EMPLOYEE" | "USER";
    tenantId?: string;
  }
}

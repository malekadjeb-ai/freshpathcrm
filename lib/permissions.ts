export type Role = "OWNER" | "ADMIN" | "TECH" | "VIEWER";

export const ROLE_HIERARCHY: Record<Role, number> = {
  OWNER: 4,
  ADMIN: 3,
  TECH: 2,
  VIEWER: 1,
};

export type Permission =
  | "jobs:read" | "jobs:write" | "jobs:delete"
  | "customers:read" | "customers:write" | "customers:delete"
  | "calendar:read" | "calendar:write"
  | "invoices:read" | "invoices:write" | "invoices:delete"
  | "estimates:read" | "estimates:write"
  | "analytics:read"
  | "settings:read" | "settings:write"
  | "billing:read" | "billing:write"
  | "users:read" | "users:write" | "users:delete"
  | "campaigns:read" | "campaigns:write"
  | "reviews:read" | "reviews:write";

const ROLE_PERMISSIONS: Record<Role, Permission[] | ["*"]> = {
  OWNER: ["*"],
  ADMIN: [
    "jobs:read", "jobs:write", "jobs:delete",
    "customers:read", "customers:write", "customers:delete",
    "calendar:read", "calendar:write",
    "invoices:read", "invoices:write", "invoices:delete",
    "estimates:read", "estimates:write",
    "analytics:read",
    "settings:read",
    "campaigns:read", "campaigns:write",
    "reviews:read", "reviews:write",
    "users:read",
  ],
  TECH: [
    "jobs:read", "jobs:write",
    "customers:read",
    "calendar:read", "calendar:write",
  ],
  VIEWER: [
    "jobs:read", "customers:read", "calendar:read",
    "invoices:read", "estimates:read", "analytics:read",
    "reviews:read",
  ],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  const perms = ROLE_PERMISSIONS[role];
  if (perms[0] === "*") return true;
  return (perms as Permission[]).includes(permission);
}

export function requirePermission(role: string | undefined, permission: Permission): void {
  if (!role || !hasPermission(role as Role, permission)) {
    throw new Error(`Insufficient permissions: requires ${permission}`);
  }
}

"use client";

import { useSession } from "next-auth/react";
import { hasPermission, type Role, type Permission } from "@/lib/permissions";

export function PermissionGate({
  permission,
  children,
  fallback = null,
}: {
  permission: Permission;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { data: session } = useSession();
  const role = ((session?.user as Record<string, unknown>)?.role as string) || "VIEWER";

  if (!hasPermission(role as Role, permission)) return <>{fallback}</>;
  return <>{children}</>;
}

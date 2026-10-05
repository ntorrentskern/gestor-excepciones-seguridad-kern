"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/actions";
import { checkPermission, type PermissionAction } from "@/lib/auth/permissions";
import type { UsuarioPublico } from "@/lib/auth/users";
import type { Dominio } from "@/types/dominio";
import type { Rol } from "@/types/roles";

interface AuthContextValue {
  user: UsuarioPublico | null;
  loading: boolean;
  refresh: () => Promise<void>;
  can: (action: PermissionAction, dominio?: Dominio) => boolean;
  rol: Rol | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [user, setUser] = useState<UsuarioPublico | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const current = await getCurrentUser();
      setUser(current);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (pathname === "/login") {
      setUser(null);
      setLoading(false);
      return;
    }
    void refresh();
  }, [pathname, refresh]);

  const can = useCallback(
    (action: PermissionAction, dominio?: Dominio) => {
      if (!user) return false;
      return checkPermission(user.rol, action, dominio);
    },
    [user]
  );

  const value = useMemo(
    () => ({
      user,
      loading,
      refresh,
      can,
      rol: user?.rol ?? null,
    }),
    [user, loading, refresh, can]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }
  return ctx;
}

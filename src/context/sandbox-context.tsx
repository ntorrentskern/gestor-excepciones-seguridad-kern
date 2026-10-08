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
import { useAuth } from "@/context/auth-context";
import { setSandboxModeAction } from "@/lib/sandbox/actions";
import {
  canAccessSandbox,
  SANDBOX_COOKIE,
} from "@/lib/sandbox/config";

type SandboxContextValue = {
  allowed: boolean;
  enabled: boolean;
  setEnabled: (value: boolean) => void;
  toggle: () => void;
};

const SandboxContext = createContext<SandboxContextValue | null>(null);

function readCookie(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie
    .split(";")
    .some((c) => c.trim() === `${SANDBOX_COOKIE}=1`);
}

function writeCookie(enabled: boolean) {
  if (typeof document === "undefined") return;
  const maxAge = enabled ? 60 * 60 * 24 * 30 : 0;
  document.cookie = `${SANDBOX_COOKIE}=${enabled ? "1" : "0"}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

export function SandboxProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const allowed = canAccessSandbox(user?.email);
  const [enabled, setEnabledState] = useState(false);

  useEffect(() => {
    if (!allowed) {
      setEnabledState(false);
      writeCookie(false);
      return;
    }
    setEnabledState(readCookie());
  }, [allowed]);

  const setEnabled = useCallback(
    (value: boolean) => {
      if (!allowed) return;
      setEnabledState(value);
      writeCookie(value);
      void setSandboxModeAction(value)
        .catch(() => {
          /* cookie cliente ya escrita; el server action puede fallar offline */
        })
        .finally(() => {
          window.dispatchEvent(new Event("sandbox-mode-changed"));
        });
    },
    [allowed]
  );

  const toggle = useCallback(() => {
    setEnabled(!enabled);
  }, [enabled, setEnabled]);

  const value = useMemo(
    () => ({ allowed, enabled: allowed && enabled, setEnabled, toggle }),
    [allowed, enabled, setEnabled, toggle]
  );

  return (
    <SandboxContext.Provider value={value}>{children}</SandboxContext.Provider>
  );
}

export function useSandbox() {
  const ctx = useContext(SandboxContext);
  if (!ctx) {
    return {
      allowed: false,
      enabled: false,
      setEnabled: () => {},
      toggle: () => {},
    };
  }
  return ctx;
}

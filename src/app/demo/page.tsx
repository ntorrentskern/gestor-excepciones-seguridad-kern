"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FlaskConical,
  ExternalLink,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";
import { useSandbox } from "@/context/sandbox-context";
import { canAccessSandbox } from "@/lib/sandbox/config";
import { reseedSandboxAction } from "@/lib/sandbox/actions";

export default function DemoPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { allowed, enabled, setEnabled } = useSandbox();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!user || !canAccessSandbox(user.email) || !allowed) {
    return (
      <div className="mx-auto max-w-lg space-y-4 rounded-2xl border border-border bg-card p-6">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 size-5 text-rose-600" aria-hidden />
          <div>
            <h2 className="text-lg font-semibold">Acceso restringido</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              El entorno de demostración solo está disponible para usuarios
              autorizados.
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={() => router.push("/")}>
          Volver al inicio
        </Button>
      </div>
    );
  }

  async function onReseed() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await reseedSandboxAction();
      setMessage(result.message);
      window.dispatchEvent(new Event("sandbox-mode-changed"));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudieron recargar los datos"
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
          <FlaskConical className="size-5" aria-hidden />
          <p className="text-xs font-semibold uppercase tracking-[0.14em]">
            Sandbox
          </p>
        </div>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          Modo demo
        </h2>
        <p className="text-sm text-muted-foreground">
          Entorno aislado con datos ficticios (María López, excepciones{" "}
          <span className="font-mono">DEMO-*</span>). No se mezclan con el
          inventario real. Actívalo para probar flujos de alta, ampliación,
          correlaciones y operaciones.
        </p>
      </div>

      <section className="space-y-4 rounded-2xl border border-amber-500/30 bg-amber-50/60 p-5 dark:bg-amber-950/30">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            onClick={() => setEnabled(true)}
            disabled={enabled}
          >
            {enabled ? "Demo ya activo" : "Activar modo demo"}
          </Button>
          {enabled ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => setEnabled(false)}
            >
              Desactivar
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => void onReseed()}
          >
            <RefreshCw className="size-4" aria-hidden />
            {busy ? "Recargando…" : "Recargar datos demo"}
          </Button>
        </div>
        {message ? (
          <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg bg-background/80 p-3 text-xs text-muted-foreground">
            {message}
          </pre>
        ) : null}
        {error ? (
          <p className="text-sm text-rose-700" role="alert">
            {error}
          </p>
        ) : null}
      </section>

      <section className="space-y-3 rounded-2xl border border-border bg-card p-5">
        <h3 className="text-base font-semibold">Atajos de la demo</h3>
        <ul className="space-y-2 text-sm">
          <li>
            <Link
              href="/sujetos/suj-demo-maria"
              className="inline-flex items-center gap-1.5 text-primary hover:underline"
            >
              Ficha María López (DEMO)
              <ExternalLink className="size-3.5" aria-hidden />
            </Link>
          </li>
          <li>
            <Link
              href="/excepciones/DEMO-HD-001"
              className="inline-flex items-center gap-1.5 font-mono text-primary hover:underline"
            >
              DEMO-HD-001
              <ExternalLink className="size-3.5" aria-hidden />
            </Link>
            <span className="ml-2 text-muted-foreground">
              (caducada — útil para ampliar)
            </span>
          </li>
          <li>
            <Link
              href="/operaciones"
              className="inline-flex items-center gap-1.5 text-primary hover:underline"
            >
              Operaciones
              <ExternalLink className="size-3.5" aria-hidden />
            </Link>
          </li>
        </ul>
      </section>
    </div>
  );
}

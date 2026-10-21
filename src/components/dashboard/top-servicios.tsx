"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppWindow } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { topServiciosAction } from "@/lib/sujetos/actions";
import type { ServicioTopStat } from "@/lib/sujetos/repository";
import { useSandbox } from "@/context/sandbox-context";

export function TopServicios() {
  const { enabled: sandboxEnabled } = useSandbox();
  const [items, setItems] = useState<ServicioTopStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void topServiciosAction(3)
      .then((rows) => {
        if (!cancelled) setItems(rows);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sandboxEnabled]);

  return (
    <Card className="shadow-none">
      <CardHeader>
        <div className="flex items-center gap-2">
          <AppWindow className="size-4 text-primary" aria-hidden />
          <CardTitle className="text-base">Top servicios excepcionados</CardTitle>
        </div>
        <CardDescription>Top 3 en excepciones activas.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin datos.</p>
        ) : (
          <ol className="space-y-2">
            {items.map((s, index) => (
              <li key={s.id}>
                <Link
                  href={`/sujetos/${s.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5 transition-colors hover:border-primary/40 hover:bg-muted/40"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-violet-500/15 text-xs font-bold text-violet-800 dark:text-violet-200">
                      {index + 1}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">
                        {s.display_name}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {s.clave}
                      </span>
                    </span>
                  </span>
                  <span className="shrink-0 text-right text-xs text-muted-foreground">
                    <span className="block font-semibold text-foreground">
                      {s.activas} activas
                    </span>
                    <span>{s.total} total</span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

"use client";

import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExcepcionesTable } from "@/components/excepciones/excepciones-table";
import {
  DOMINIO_LABELS,
  type Dominio,
} from "@/types/dominio";

const PANEL_COPY: Record<
  Dominio,
  { title: string; description: string }
> = {
  seguridad: {
    title: "Panel Seguridad",
    description:
      "Excepciones de ciberseguridad. Puedes aprobar cualquier dominio desde el detalle.",
  },
  sistemas: {
    title: "Panel Sistemas",
    description:
      "Infra, firewall, VPN, OT y cloud. Puedes aprobar excepciones de este dominio.",
  },
  helpdesk: {
    title: "Panel Helpdesk",
    description:
      "Endpoint y soporte. Las altas quedan pendientes hasta aprobación de Seguridad.",
  },
};

export function DominioPanel({ dominio }: { dominio: Dominio }) {
  const copy = PANEL_COPY[dominio];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            {DOMINIO_LABELS[dominio]}
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            {copy.title}
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {copy.description}
          </p>
        </div>
        <Button asChild>
          <Link href={`/excepciones/nueva?dominio=${dominio}`}>
            <PlusCircle className="size-4" />
            Nueva excepción
          </Link>
        </Button>
      </div>

      <ExcepcionesTable dominioFijo={dominio} />
    </div>
  );
}

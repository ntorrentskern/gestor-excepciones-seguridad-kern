"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EstadoBadge } from "@/components/excepciones/estado-badge";
import { useExcepciones } from "@/context/excepciones-context";
import {
  diasHastaRevision,
  formatearFecha,
} from "@/lib/excepciones/utils";
import { cn } from "@/lib/utils";

export function ProximasRevisionList() {
  const { proximasRevision, loading } = useExcepciones();

  return (
    <Card className="shadow-none ring-orange-200/70">
      <CardHeader className="border-b border-orange-100/80 bg-orange-50/50">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex size-9 items-center justify-center rounded-xl bg-orange-500/15 text-orange-700">
            <AlertTriangle className="size-4" aria-hidden />
          </div>
          <div>
            <CardTitle className="font-sans text-base font-semibold text-foreground">
              Excepciones próximas a revisión
            </CardTitle>
            <CardDescription className="mt-1 text-muted-foreground">
              Activas con{" "}
              <span className="font-medium text-orange-800">
                fecha_revision ≤ 14 días
              </span>{" "}
              desde hoy. Prioriza renovación o cierre.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <p className="p-6 text-sm text-muted-foreground">Cargando…</p>
        ) : proximasRevision.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">
            No hay excepciones dentro de la ventana de 14 días.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>ID</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Activo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Revisión</TableHead>
                <TableHead className="text-right">Días</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {proximasRevision.map((exc) => {
                const dias = diasHastaRevision(exc.fecha_revision);
                const critica = dias <= 7;

                return (
                  <TableRow
                    key={exc.id}
                    className={cn(
                      critica ? "bg-rose-50/50" : "bg-orange-50/30"
                    )}
                  >
                    <TableCell className="font-medium">
                      <Link
                        href={`/excepciones/${exc.id}`}
                        className="font-mono text-sm text-primary hover:underline"
                      >
                        {exc.id}
                      </Link>
                    </TableCell>
                    <TableCell>{exc.tipo_excepcion}</TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {exc.activo_afectado}
                    </TableCell>
                    <TableCell>
                      <EstadoBadge estado={exc.estado} />
                    </TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {formatearFecha(exc.fecha_revision)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant="outline"
                        className={cn(
                          "rounded-md tabular-nums",
                          critica
                            ? "border-rose-200 bg-rose-50 text-rose-800"
                            : "border-orange-200 bg-orange-50 text-orange-800"
                        )}
                      >
                        {dias < 0
                          ? `${Math.abs(dias)}d vencida`
                          : dias === 0
                            ? "Hoy"
                            : `${dias}d`}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

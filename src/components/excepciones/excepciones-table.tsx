"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EstadoBadge } from "@/components/excepciones/estado-badge";
import { useExcepciones } from "@/context/excepciones-context";
import { exportExcepcionesToCsv } from "@/lib/excepciones/export-csv";
import { formatearFecha } from "@/lib/excepciones/utils";
import {
  ESTADOS_EXCEPCION,
  TIPOS_EXCEPCION,
  type EstadoExcepcion,
  type TipoExcepcion,
} from "@/types/excepcion";

export function ExcepcionesTable() {
  const router = useRouter();
  const { filter, loading } = useExcepciones();
  const [estado, setEstado] = useState<EstadoExcepcion | "Todos">("Todos");
  const [tipo, setTipo] = useState<TipoExcepcion | "Todos">("Todos");
  const [busqueda, setBusqueda] = useState("");

  const rows = useMemo(
    () =>
      filter({
        estado,
        tipo_excepcion: tipo,
        busqueda,
      }),
    [filter, estado, tipo, busqueda]
  );

  return (
    <div className="space-y-4">
      <Card className="shadow-none">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 pb-3">
          <CardTitle className="text-base font-semibold">Filtros</CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={loading || rows.length === 0}
            onClick={() => exportExcepcionesToCsv(rows)}
          >
            <Download className="size-4" />
            Exportar CSV
          </Button>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2 sm:col-span-3">
            <Label htmlFor="filtro-busqueda">Buscar</Label>
            <Input
              id="filtro-busqueda"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="ID, solicitante, activo, origen…"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="filtro-estado">Estado</Label>
            <Select
              value={estado}
              onValueChange={(v) =>
                setEstado(v as EstadoExcepcion | "Todos")
              }
            >
              <SelectTrigger id="filtro-estado" className="w-full">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos">Todos</SelectItem>
                {ESTADOS_EXCEPCION.map((e) => (
                  <SelectItem key={e} value={e}>
                    {e}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="filtro-tipo">Tipo de excepción</Label>
            <Select
              value={tipo}
              onValueChange={(v) => setTipo(v as TipoExcepcion | "Todos")}
            >
              <SelectTrigger id="filtro-tipo" className="w-full">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos">Todos</SelectItem>
                {TIPOS_EXCEPCION.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader className="flex flex-row items-center justify-between border-b border-border/70 pb-3">
          <CardTitle className="text-base font-semibold">
            Listado de excepciones
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {loading
              ? "…"
              : `${rows.length} registro${rows.length === 1 ? "" : "s"}`}
          </p>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="p-6 text-sm text-muted-foreground">Cargando…</p>
          ) : rows.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              No hay excepciones con los filtros seleccionados.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>ID</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Origen</TableHead>
                    <TableHead>Solicitante</TableHead>
                    <TableHead>Activo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Temporalidad</TableHead>
                    <TableHead>Solicitud</TableHead>
                    <TableHead>Revisión</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((exc) => (
                    <TableRow
                      key={exc.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/excepciones/${exc.id}`)}
                    >
                      <TableCell className="font-mono text-sm font-medium">
                        <Link
                          href={`/excepciones/${exc.id}`}
                          className="text-primary hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {exc.id}
                        </Link>
                      </TableCell>
                      <TableCell>{exc.tipo_excepcion}</TableCell>
                      <TableCell className="max-w-[140px] truncate">
                        {exc.origen_peticion}
                      </TableCell>
                      <TableCell className="max-w-[180px] truncate text-muted-foreground">
                        {exc.solicitante_email}
                      </TableCell>
                      <TableCell className="max-w-[160px] truncate">
                        {exc.activo_afectado}
                      </TableCell>
                      <TableCell>
                        <EstadoBadge estado={exc.estado} />
                      </TableCell>
                      <TableCell>{exc.temporalidad}</TableCell>
                      <TableCell>
                        {formatearFecha(exc.fecha_solicitud)}
                      </TableCell>
                      <TableCell>
                        {formatearFecha(exc.fecha_revision)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

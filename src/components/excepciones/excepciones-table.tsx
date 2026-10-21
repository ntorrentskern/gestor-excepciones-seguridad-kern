"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download, X } from "lucide-react";
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
import {
  ALL_CSV_COLUMN_KEYS,
  CSV_COLUMNS,
  exportExcepcionesToCsv,
  type CsvColumnKey,
} from "@/lib/excepciones/export-csv";
import { formatearFecha } from "@/lib/excepciones/utils";
import { cn } from "@/lib/utils";
import {
  DOMINIO_LABELS,
  DOMINIOS,
  ESTADOS_EXCEPCION,
  tiposDeDominio,
  type Dominio,
  type EstadoExcepcion,
  type TipoExcepcion,
} from "@/types/excepcion";

type Props = {
  /** Si se indica, filtra siempre por ese dominio (paneles). */
  dominioFijo?: Dominio;
};

function resumenFiltros(input: {
  dominio: Dominio | "Todos";
  estado: EstadoExcepcion | "Todos";
  tipo: TipoExcepcion | "Todos";
  busqueda: string;
  total: number;
}): string {
  const partes: string[] = [];
  if (input.dominio !== "Todos") {
    partes.push(DOMINIO_LABELS[input.dominio]);
  }
  if (input.estado !== "Todos") partes.push(input.estado);
  if (input.tipo !== "Todos") partes.push(input.tipo);
  if (input.busqueda.trim()) {
    partes.push(`búsqueda «${input.busqueda.trim()}»`);
  }
  const filtros =
    partes.length > 0 ? partes.join(" · ") : "sin filtros (todas)";
  return `${input.total} registro${input.total === 1 ? "" : "s"} · ${filtros}`;
}

export function ExcepcionesTable({ dominioFijo }: Props) {
  const router = useRouter();
  const { filter, loading } = useExcepciones();
  const [estado, setEstado] = useState<EstadoExcepcion | "Todos">("Todos");
  const [tipo, setTipo] = useState<TipoExcepcion | "Todos">("Todos");
  const [dominio, setDominio] = useState<Dominio | "Todos">(
    dominioFijo ?? "Todos"
  );
  const [busqueda, setBusqueda] = useState("");
  const [exportOpen, setExportOpen] = useState(false);
  const [csvColumns, setCsvColumns] = useState<Set<CsvColumnKey>>(
    () => new Set(ALL_CSV_COLUMN_KEYS)
  );

  const dominioEfectivo = dominioFijo ?? dominio;
  const tiposFiltro =
    dominioEfectivo === "Todos"
      ? DOMINIOS.flatMap((d) => [...tiposDeDominio(d)])
      : [...tiposDeDominio(dominioEfectivo)];

  const rows = useMemo(
    () =>
      filter({
        estado,
        tipo_excepcion: tipo,
        dominio: dominioEfectivo,
        busqueda,
      }),
    [filter, estado, tipo, dominioEfectivo, busqueda]
  );

  const filtrosResumen = resumenFiltros({
    dominio: dominioEfectivo,
    estado,
    tipo,
    busqueda,
    total: rows.length,
  });

  const selectedCount = csvColumns.size;
  const allSelected = selectedCount === ALL_CSV_COLUMN_KEYS.length;

  function toggleColumn(key: CsvColumnKey) {
    setCsvColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function selectAllColumns() {
    setCsvColumns(new Set(ALL_CSV_COLUMN_KEYS));
  }

  function clearColumns() {
    setCsvColumns(new Set());
  }

  function downloadCsv() {
    const columns = ALL_CSV_COLUMN_KEYS.filter((key) => csvColumns.has(key));
    if (columns.length === 0) return;
    exportExcepcionesToCsv(rows, { columns });
    setExportOpen(false);
  }

  return (
    <div className="space-y-4">
      <Card className="shadow-none">
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 pb-3">
          <CardTitle className="text-base font-semibold">Filtros</CardTitle>
          <div className="flex flex-col items-end gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-auto flex-col items-start gap-0.5 px-3 py-1.5"
              disabled={loading || rows.length === 0}
              aria-expanded={exportOpen}
              onClick={() => setExportOpen((open) => !open)}
            >
              <span className="inline-flex items-center gap-1.5">
                <Download className="size-4" />
                Descargar CSV
              </span>
              <span className="text-[11px] font-normal text-muted-foreground">
                Con los filtros actuales
              </span>
            </Button>
            <p className="max-w-[280px] text-right text-[11px] text-muted-foreground">
              {loading ? "…" : filtrosResumen}
            </p>
          </div>
        </CardHeader>
        {exportOpen ? (
          <div className="mx-6 mb-4 rounded-xl border border-border bg-muted/30 p-4">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium">Columnas del CSV</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Se exportan las {rows.length} excepción
                  {rows.length === 1 ? "" : "es"} visibles con los filtros de
                  esta vista.
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setExportOpen(false)}
                aria-label="Cerrar selector de columnas"
              >
                <X className="size-4" />
              </Button>
            </div>
            <div className="mb-3 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={selectAllColumns}
                disabled={allSelected}
              >
                Todas
              </Button>
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={clearColumns}
                disabled={selectedCount === 0}
              >
                Ninguna
              </Button>
            </div>
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {CSV_COLUMNS.map((col) => {
                const checked = csvColumns.has(col.key);
                return (
                  <li key={col.key}>
                    <label
                      className={cn(
                        "flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 text-sm transition-colors",
                        checked
                          ? "border-primary/30 bg-primary/5"
                          : "border-border bg-background hover:bg-muted/50"
                      )}
                    >
                      <input
                        type="checkbox"
                        className="size-4 accent-primary"
                        checked={checked}
                        onChange={() => toggleColumn(col.key)}
                      />
                      <span className="min-w-0">
                        <span className="block font-medium leading-tight">
                          {col.label}
                        </span>
                        <span className="block text-[11px] text-muted-foreground">
                          {col.key}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                {selectedCount} columna{selectedCount === 1 ? "" : "s"} ·{" "}
                {rows.length} fila{rows.length === 1 ? "" : "s"}
              </p>
              <Button
                type="button"
                size="sm"
                disabled={selectedCount === 0 || rows.length === 0}
                onClick={downloadCsv}
              >
                <Download className="size-4" />
                Descargar
              </Button>
            </div>
          </div>
        ) : null}
        <CardContent
          className={`grid gap-4 ${dominioFijo ? "sm:grid-cols-3" : "sm:grid-cols-4"}`}
        >
          <div className="space-y-2 sm:col-span-full">
            <Label htmlFor="filtro-busqueda">Buscar</Label>
            <Input
              id="filtro-busqueda"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="ID, usuario, equipo, origen…"
            />
          </div>
          {!dominioFijo ? (
            <div className="space-y-2">
              <Label htmlFor="filtro-dominio">Dominio</Label>
              <Select
                value={dominio}
                onValueChange={(v) => {
                  setDominio(v as Dominio | "Todos");
                  setTipo("Todos");
                }}
              >
                <SelectTrigger id="filtro-dominio" className="w-full">
                  <SelectValue placeholder="Dominio" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todos">Todos</SelectItem>
                  {DOMINIOS.map((d) => (
                    <SelectItem key={d} value={d}>
                      {DOMINIO_LABELS[d]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
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
                {tiposFiltro.map((t) => (
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
            <div className="overflow-x-auto px-2">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-4">ID</TableHead>
                    {!dominioFijo ? <TableHead>Dominio</TableHead> : null}
                    <TableHead>Tipo</TableHead>
                    <TableHead>Origen</TableHead>
                    <TableHead>Usuario afectado</TableHead>
                    <TableHead>Equipo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Temporalidad</TableHead>
                    <TableHead>Solicitud</TableHead>
                    <TableHead className="pr-4">Revisión</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((exc) => (
                    <TableRow
                      key={exc.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/excepciones/${exc.id}`)}
                    >
                      <TableCell className="pl-4 font-mono text-xs font-medium">
                        <Link
                          href={`/excepciones/${exc.id}`}
                          className="text-primary hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {exc.id}
                        </Link>
                      </TableCell>
                      {!dominioFijo ? (
                        <TableCell>{DOMINIO_LABELS[exc.dominio]}</TableCell>
                      ) : null}
                      <TableCell>{exc.tipo_excepcion}</TableCell>
                      <TableCell className="max-w-[140px] truncate">
                        {exc.origen_solicitud}
                        {exc.jira_ticket_id ? ` (${exc.jira_ticket_id})` : ""}
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
                      <TableCell className="pr-4">
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

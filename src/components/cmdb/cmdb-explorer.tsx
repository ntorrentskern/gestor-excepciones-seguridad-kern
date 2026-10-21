"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AppWindow,
  Download,
  Loader2,
  Monitor,
  Search,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  exportCmdbCsvAction,
  listCmdbMatrixAction,
} from "@/lib/cmdb/actions";
import {
  cmdbPath,
  type CmdbEstadoFiltro,
  type CmdbListResult,
  type CmdbMatrixRow,
  type CmdbTipoFiltro,
} from "@/types/cmdb";
import { DOMINIO_LABELS, DOMINIOS, type Dominio } from "@/types/dominio";
import { cn } from "@/lib/utils";
import {
  BadgeStack,
  HostBadge,
  ServicioBadge,
  UsuarioBadge,
} from "@/components/cmdb/cmdb-badges";
import { useSandbox } from "@/context/sandbox-context";

const PAGE_SIZES = [15, 25, 50] as const;

function iconForTipo(tipo: string) {
  if (tipo === "usuario") return User;
  if (tipo === "servicio") return AppWindow;
  return Monitor;
}

function tipoTone(tipo: string) {
  if (tipo === "usuario")
    return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300";
  if (tipo === "servicio")
    return "bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300";
  return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200";
}

export function CmdbExplorer() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { enabled: sandboxEnabled } = useSandbox();

  const [tipo, setTipo] = useState<CmdbTipoFiltro>(
    (searchParams.get("tipo") as CmdbTipoFiltro) || "todos"
  );
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [qDebounced, setQDebounced] = useState(q);
  const [estado, setEstado] = useState<CmdbEstadoFiltro>(
    (searchParams.get("estado") as CmdbEstadoFiltro) || "Todos"
  );
  const [dominio, setDominio] = useState<Dominio | "Todos">(
    (searchParams.get("dominio") as Dominio | "Todos") || "Todos"
  );
  const [servicioId, setServicioId] = useState(
    searchParams.get("servicio") ?? ""
  );
  const [servicioLabel, setServicioLabel] = useState(
    searchParams.get("servicioLabel") ?? ""
  );
  const [page, setPage] = useState(Number(searchParams.get("page") || 1));
  const [pageSize, setPageSize] = useState(
    Number(searchParams.get("pageSize") || 25)
  );
  const [data, setData] = useState<CmdbListResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q.trim()), 280);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    setPage(1);
  }, [tipo, qDebounced, estado, dominio, servicioId, pageSize]);

  const syncUrl = useCallback(() => {
    const params = new URLSearchParams();
    if (tipo !== "todos") params.set("tipo", tipo);
    if (qDebounced) params.set("q", qDebounced);
    if (estado !== "Todos") params.set("estado", estado);
    if (dominio !== "Todos") params.set("dominio", dominio);
    if (servicioId) {
      params.set("servicio", servicioId);
      if (servicioLabel) params.set("servicioLabel", servicioLabel);
    }
    if (page > 1) params.set("page", String(page));
    if (pageSize !== 25) params.set("pageSize", String(pageSize));
    const qs = params.toString();
    router.replace(qs ? `/cmdb?${qs}` : "/cmdb");
  }, [
    tipo,
    qDebounced,
    estado,
    dominio,
    servicioId,
    servicioLabel,
    page,
    pageSize,
    router,
  ]);

  useEffect(() => {
    syncUrl();
  }, [syncUrl]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listCmdbMatrixAction({
        tipo,
        q: qDebounced || undefined,
        estado,
        dominio,
        servicioId: servicioId || undefined,
        page,
        pageSize,
      });
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar CMDB");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [tipo, qDebounced, estado, dominio, servicioId, page, pageSize]);

  useEffect(() => {
    void load();
  }, [load, sandboxEnabled]);

  const totalPages = useMemo(() => {
    if (!data) return 1;
    return Math.max(1, Math.ceil(data.total / data.pageSize));
  }, [data]);

  function filterByServicio(id: string, label: string) {
    setServicioId(id);
    setServicioLabel(label);
    setTipo("todos");
  }

  function clearServicioFilter() {
    setServicioId("");
    setServicioLabel("");
  }

  async function onExport() {
    setExporting(true);
    try {
      const csv = await exportCmdbCsvAction({
        tipo,
        q: qDebounced || undefined,
        estado,
        dominio,
        servicioId: servicioId || undefined,
      });
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cmdb-inventario.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al exportar");
    } finally {
      setExporting(false);
    }
  }

  const counts = data?.counts;

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">CMDB</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Vista unificada por persona · usa las pestañas para inventariar
            equipos o servicios
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void onExport()}
          disabled={exporting || loading}
        >
          {exporting ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Download className="size-3.5" />
          )}
          Exportar CSV
        </Button>
      </div>

      <div className="flex flex-wrap gap-1 rounded-xl border border-border bg-muted/30 p-1">
        {(
          [
            ["todos", "Personas", counts?.usuario],
            ["activo", "Activos", counts?.activo],
            ["servicio", "Servicios", counts?.servicio],
          ] as const
        ).map(([id, label, n]) => {
          const active =
            id === "todos"
              ? tipo === "todos" || tipo === "usuario"
              : tipo === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setTipo(id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                active
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
              {typeof n === "number" ? (
                <span className="tabular-nums text-muted-foreground">({n})</span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 lg:flex-row lg:flex-wrap lg:items-end">
        <div className="min-w-[200px] flex-1 space-y-1">
          <Label htmlFor="cmdb-q" className="text-xs">
            Buscar
          </Label>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="cmdb-q"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Nombre, correo, hostname, servicio, ID…"
              className="h-9 pl-8 text-sm"
            />
          </div>
        </div>
        <div className="w-full space-y-1 sm:w-40">
          <Label className="text-xs">Estado</Label>
          <Select
            value={estado}
            onValueChange={(v) => setEstado(v as CmdbEstadoFiltro)}
          >
            <SelectTrigger className="h-9 w-full text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos">Todos</SelectItem>
              <SelectItem value="Activas">Activas</SelectItem>
              <SelectItem value="Pendiente">Pendiente</SelectItem>
              <SelectItem value="Vencida">Vencida</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-full space-y-1 sm:w-40">
          <Label className="text-xs">Dominio</Label>
          <Select
            value={dominio}
            onValueChange={(v) => setDominio(v as Dominio | "Todos")}
          >
            <SelectTrigger className="h-9 w-full text-sm">
              <SelectValue />
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
        <div className="w-full space-y-1 sm:w-28">
          <Label className="text-xs">Por página</Label>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => setPageSize(Number(v))}
          >
            <SelectTrigger className="h-9 w-full text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {servicioId ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-900 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-100">
          <span>
            Filtrado por servicio:{" "}
            <strong>{servicioLabel || servicioId}</strong>
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={clearServicioFilter}
          >
            Quitar filtro
          </Button>
        </div>
      ) : null}

      {error ? (
        <p className="text-sm text-rose-700" role="alert">
          {error}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {loading ? (
          <p className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Cargando inventario…
          </p>
        ) : !data || data.rows.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-medium text-foreground">Sin resultados</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Prueba otro filtro o limpia la búsqueda.
            </p>
          </div>
        ) : tipo === "servicio" ? (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-3">Servicio</TableHead>
                <TableHead>Dominio</TableHead>
                <TableHead className="text-center">Usuarios</TableHead>
                <TableHead className="text-center">Equipos</TableHead>
                <TableHead>Excepciones</TableHead>
                <TableHead className="pr-3 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.rows.map((row) => (
                <ServicioMatrixRow key={row.sujeto.id} row={row} />
              ))}
            </TableBody>
          </Table>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-3">
                  {tipo === "activo" ? "Equipo" : "Persona"}
                </TableHead>
                <TableHead>
                  {tipo === "activo" ? "Usuarios" : "Equipos"}
                </TableHead>
                <TableHead>Servicios</TableHead>
                <TableHead>Excepciones</TableHead>
                <TableHead className="pr-3 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.rows.map((row) => (
                <PersonaActivoMatrixRow
                  key={row.sujeto.id}
                  row={row}
                  activeServicioId={servicioId}
                  onServicioClick={filterByServicio}
                />
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {data && data.total > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>
            {(page - 1) * pageSize + 1}–
            {Math.min(page * pageSize, data.total)} de {data.total}
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Anterior
            </Button>
            <span className="flex items-center px-1 tabular-nums">
              {page} / {totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              Siguiente
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SujetoCell({ row }: { row: CmdbMatrixRow }) {
  const Icon = iconForTipo(row.sujeto.tipo);
  return (
    <div className="flex items-start gap-2">
      <div
        className={cn(
          "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md",
          tipoTone(row.sujeto.tipo)
        )}
      >
        <Icon className="size-3.5" aria-hidden />
      </div>
      <div className="min-w-0">
        <Link
          href={cmdbPath(row.sujeto)}
          className="block truncate text-sm font-semibold text-foreground hover:underline"
        >
          {row.sujeto.display_name}
        </Link>
        {row.sujeto.clave.toLowerCase() !==
        row.sujeto.display_name.toLowerCase() ? (
          <p className="truncate font-mono text-[11px] text-muted-foreground">
            {row.sujeto.clave}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function ExcepcionesBadges({ row }: { row: CmdbMatrixRow }) {
  return (
    <div className="flex flex-wrap gap-1 text-[11px]">
      <span className="rounded-md border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
        {row.activas} activas
      </span>
      {row.pendientes > 0 ? (
        <span className="rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          {row.pendientes} pend.
        </span>
      ) : null}
      {row.caducadas > 0 ? (
        <span className="rounded-md border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
          {row.caducadas} venc.
        </span>
      ) : null}
      {row.total_excepciones === 0 ? (
        <span className="text-muted-foreground">0</span>
      ) : null}
    </div>
  );
}

function AccionesCell({ row }: { row: CmdbMatrixRow }) {
  return (
    <div className="inline-flex flex-col items-end gap-1">
      <Button asChild variant="outline" size="sm" className="h-7 text-xs">
        <Link href={cmdbPath(row.sujeto)}>Ver ficha</Link>
      </Button>
      {row.excepcion_ejemplo_id ? (
        <Link
          href={`/excepciones/${row.excepcion_ejemplo_id}`}
          className="font-mono text-[11px] text-primary hover:underline"
        >
          {row.excepcion_ejemplo_id}
        </Link>
      ) : null}
    </div>
  );
}

/** Pestaña Servicios: métricas agregadas, sin listar equipos sueltos. */
function ServicioMatrixRow({ row }: { row: CmdbMatrixRow }) {
  return (
    <TableRow>
      <TableCell className="py-2 pl-3 align-top">
        <SujetoCell row={row} />
      </TableCell>
      <TableCell className="py-2 align-top">
        {row.dominios.length === 0 ? (
          <span className="text-xs text-muted-foreground">—</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {row.dominios.map((d) => (
              <span
                key={d}
                className="rounded-md border border-border bg-muted/40 px-1.5 py-0.5 text-[11px] text-muted-foreground"
              >
                {DOMINIO_LABELS[d] ?? d}
              </span>
            ))}
          </div>
        )}
      </TableCell>
      <TableCell className="py-2 text-center align-top">
        <span className="text-sm font-semibold tabular-nums">
          {row.n_usuarios}
        </span>
      </TableCell>
      <TableCell className="py-2 text-center align-top">
        <span className="text-sm font-semibold tabular-nums">
          {row.n_equipos}
        </span>
      </TableCell>
      <TableCell className="py-2 align-top">
        <ExcepcionesBadges row={row} />
      </TableCell>
      <TableCell className="py-2 pr-3 text-right align-top">
        <AccionesCell row={row} />
      </TableCell>
    </TableRow>
  );
}

/** Personas / Activos: badges de correlación cruzada. */
function PersonaActivoMatrixRow({
  row,
  activeServicioId,
  onServicioClick,
}: {
  row: CmdbMatrixRow;
  activeServicioId: string;
  onServicioClick: (id: string, label: string) => void;
}) {
  const col2 = row.sujeto.tipo === "activo" ? row.usuarios : row.equipos;

  return (
    <TableRow>
      <TableCell className="py-2 pl-3 align-top">
        <SujetoCell row={row} />
      </TableCell>
      <TableCell className="py-2 align-top">
        <BadgeStack>
          {col2.slice(0, 6).map((item) =>
            item.tipo === "usuario" ? (
              <UsuarioBadge key={item.id || item.clave} item={item} />
            ) : (
              <HostBadge key={item.id || item.clave} item={item} />
            )
          )}
          {col2.length > 6 ? (
            <span className="text-[11px] text-muted-foreground">
              +{col2.length - 6}
            </span>
          ) : null}
        </BadgeStack>
      </TableCell>
      <TableCell className="py-2 align-top">
        <BadgeStack>
          {row.servicios.slice(0, 6).map((s) => (
            <ServicioBadge
              key={s.id || s.clave}
              item={s}
              active={s.id === activeServicioId}
              onClick={
                s.id
                  ? () => onServicioClick(s.id, s.display_name)
                  : undefined
              }
            />
          ))}
          {row.servicios.length > 6 ? (
            <span className="text-[11px] text-muted-foreground">
              +{row.servicios.length - 6}
            </span>
          ) : null}
        </BadgeStack>
      </TableCell>
      <TableCell className="py-2 align-top">
        <ExcepcionesBadges row={row} />
      </TableCell>
      <TableCell className="py-2 pr-3 text-right align-top">
        <AccionesCell row={row} />
      </TableCell>
    </TableRow>
  );
}

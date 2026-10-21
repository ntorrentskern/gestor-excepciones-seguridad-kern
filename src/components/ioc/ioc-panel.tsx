"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Copy,
  Download,
  ExternalLink,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
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
import {
  createIocAction,
  deleteIocAction,
  deleteIocsBulkAction,
  importIocsBulkAction,
  listIocsAction,
  updateIocAction,
} from "@/lib/ioc/actions";
import type { Ioc, TipoIoc } from "@/types/ioc";
import { TIPO_IOC_LABELS } from "@/types/ioc";
import { cn } from "@/lib/utils";

type Props = { tipo: TipoIoc };

export function IocPanel({ tipo }: Props) {
  const label = TIPO_IOC_LABELS[tipo];
  const feedPath = tipo === "ip" ? "/feeds/ioc/ips" : "/feeds/ioc/dominios";
  const feedHtmlPath = `${feedPath}/html`;

  const [items, setItems] = useState<Ioc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [valor, setValor] = useState("");
  const [notas, setNotas] = useState("");
  const [fuente, setFuente] = useState("");
  const [editing, setEditing] = useState<Ioc | null>(null);

  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkFuente, setBulkFuente] = useState("import bulk");

  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const feedTxtUrl = origin ? `${origin}${feedPath}` : feedPath;
  const feedHtmlUrl = origin ? `${origin}${feedHtmlPath}` : feedHtmlPath;

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await listIocsAction(tipo, q || undefined);
      setItems(rows);
      setSelected(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  }, [tipo, q]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const activos = useMemo(
    () => items.filter((i) => i.activo).length,
    [items]
  );

  function resetForm() {
    setValor("");
    setNotas("");
    setFuente("");
    setEditing(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setOkMsg(null);
    try {
      if (editing) {
        await updateIocAction(editing.id, {
          valor,
          notas,
          fuente,
          activo: editing.activo,
        });
        setOkMsg("IOC actualizado.");
      } else {
        await createIocAction(tipo, { valor, notas, fuente, activo: true });
        setOkMsg(`${label} añadido.`);
      }
      resetForm();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setBusy(false);
    }
  }

  function startEdit(item: Ioc) {
    setEditing(item);
    setValor(item.valor);
    setNotas(item.notas);
    setFuente(item.fuente);
    setOkMsg(null);
    setError(null);
  }

  async function toggleActivo(item: Ioc) {
    setBusy(true);
    setError(null);
    try {
      await updateIocAction(item.id, {
        valor: item.valor,
        notas: item.notas,
        fuente: item.fuente,
        activo: !item.activo,
      });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  async function removeOne(id: string) {
    if (!confirm("¿Eliminar este IOC?")) return;
    setBusy(true);
    try {
      await deleteIocAction(id);
      if (editing?.id === id) resetForm();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar");
    } finally {
      setBusy(false);
    }
  }

  async function removeSelected() {
    if (selected.size === 0) return;
    if (!confirm(`¿Eliminar ${selected.size} IOC(s)?`)) return;
    setBusy(true);
    try {
      await deleteIocsBulkAction(Array.from(selected));
      resetForm();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar");
    } finally {
      setBusy(false);
    }
  }

  async function onBulkImport(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setOkMsg(null);
    try {
      const result = await importIocsBulkAction(tipo, bulkText, bulkFuente);
      setOkMsg(
        `Importados: ${result.created}. Omitidos (duplicados): ${result.skipped}.` +
          (result.invalid.length
            ? ` Inválidos: ${result.invalid.length}.`
            : "")
      );
      setBulkText("");
      setBulkOpen(false);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al importar");
    } finally {
      setBusy(false);
    }
  }

  function exportTxt() {
    const lines = items.map((i) => i.valor);
    const blob = new Blob([lines.join("\n") + "\n"], {
      type: "text/plain;charset=utf-8",
    });
    downloadBlob(blob, `ioc-${tipo}.txt`);
  }

  function exportCsv() {
    const header = "valor,activo,fuente,notas,updated_at\n";
    const rows = items
      .map((i) =>
        [i.valor, i.activo ? "1" : "0", csvEscape(i.fuente), csvEscape(i.notas), i.updated_at].join(
          ","
        )
      )
      .join("\n");
    const blob = new Blob([header + rows + "\n"], {
      type: "text/csv;charset=utf-8",
    });
    downloadBlob(blob, `ioc-${tipo}.csv`);
  }

  async function copyUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setOkMsg("URL copiada al portapapeles.");
    } catch {
      setError("No se pudo copiar la URL.");
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === items.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(items.map((i) => i.id)));
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            IOC
          </p>
          <h2 className="text-xl font-semibold tracking-tight">
            {label}s maliciosos
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {activos} activos · {items.length} totales
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={exportTxt}>
            <Download className="size-3.5" />
            Exportar TXT
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={exportCsv}>
            <Download className="size-3.5" />
            Exportar CSV
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setBulkOpen((v) => !v)}
          >
            <Upload className="size-3.5" />
            Importar
          </Button>
        </div>
      </div>

      <Card className="shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">URLs del feed</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <FeedUrlRow
            label="TXT"
            url={feedTxtUrl}
            onCopy={() => void copyUrl(feedTxtUrl)}
          />
          <FeedUrlRow
            label="HTML"
            url={feedHtmlUrl}
            onCopy={() => void copyUrl(feedHtmlUrl)}
          />
        </CardContent>
      </Card>

      {bulkOpen ? (
        <Card className="shadow-none border-primary/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Importación masiva</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onBulkImport} className="space-y-3">
              <Textarea
                rows={8}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder={
                  tipo === "ip"
                    ? "1.2.3.4\n10.0.0.0/8"
                    : "malicious.example.com"
                }
                className="font-mono text-xs"
              />
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <div className="min-w-0 flex-1 space-y-1">
                  <Label htmlFor="bulk-fuente">Fuente</Label>
                  <Input
                    id="bulk-fuente"
                    value={bulkFuente}
                    onChange={(e) => setBulkFuente(e.target.value)}
                  />
                </div>
                <Button type="submit" disabled={busy || !bulkText.trim()}>
                  {busy ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Upload className="size-4" />
                  )}
                  Importar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card className="shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            {editing ? `Editar ${label}` : `Añadir ${label}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={onSubmit}
            className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]"
          >
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="ioc-valor">{label}</Label>
              <Input
                id="ioc-valor"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder={tipo === "ip" ? "203.0.113.10" : "ejemplo.com"}
                className="font-mono text-sm"
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ioc-fuente">Fuente</Label>
              <Input
                id="ioc-fuente"
                value={fuente}
                onChange={(e) => setFuente(e.target.value)}
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="ioc-notas">Notas</Label>
              <Input
                id="ioc-notas"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
              />
            </div>
            <div className="flex items-end gap-2">
              {editing ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                  disabled={busy}
                >
                  Cancelar
                </Button>
              ) : null}
              <Button type="submit" disabled={busy || !valor.trim()}>
                {busy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : editing ? (
                  <Pencil className="size-4" />
                ) : (
                  <Plus className="size-4" />
                )}
                {editing ? "Guardar" : "Añadir"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {error ? (
        <p className="text-sm text-rose-700" role="alert">
          {error}
        </p>
      ) : null}
      {okMsg ? (
        <p className="text-sm text-emerald-700 dark:text-emerald-400">{okMsg}</p>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`Filtrar ${label.toLowerCase()}s…`}
          className="max-w-sm"
        />
        {selected.size > 0 ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void removeSelected()}
            disabled={busy}
          >
            <Trash2 className="size-3.5" />
            Eliminar seleccionados ({selected.size})
          </Button>
        ) : null}
      </div>

      <Card className="shadow-none overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <p className="p-6 text-sm text-muted-foreground">Cargando…</p>
          ) : items.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              No hay {label.toLowerCase()}s. Añade uno o importa una lista.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-10 pl-4">
                    <input
                      type="checkbox"
                      checked={
                        items.length > 0 && selected.size === items.length
                      }
                      onChange={toggleSelectAll}
                      aria-label="Seleccionar todos"
                    />
                  </TableHead>
                  <TableHead>{label}</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fuente</TableHead>
                  <TableHead>Notas</TableHead>
                  <TableHead className="pr-4 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="pl-4">
                      <input
                        type="checkbox"
                        checked={selected.has(item.id)}
                        onChange={() => toggleSelect(item.id)}
                        aria-label={`Seleccionar ${item.valor}`}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-xs font-medium">
                      {item.valor}
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => void toggleActivo(item)}
                        className={cn(
                          "rounded-md px-2 py-0.5 text-[11px] font-medium",
                          item.activo
                            ? "bg-rose-500/15 text-rose-800 dark:text-rose-300"
                            : "bg-muted text-muted-foreground"
                        )}
                        title="Clic para activar/desactivar en el feed FW"
                      >
                        {item.activo ? "En feed" : "Pausado"}
                      </button>
                    </TableCell>
                    <TableCell className="max-w-[140px] truncate text-xs text-muted-foreground">
                      {item.fuente || "—"}
                    </TableCell>
                    <TableCell className="max-w-[180px] truncate text-xs text-muted-foreground">
                      {item.notas || "—"}
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      <div className="inline-flex gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => startEdit(item)}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => void removeOne(item.id)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function FeedUrlRow({
  label,
  url,
  onCopy,
}: {
  label: string;
  url: string;
  onCopy: () => void;
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-muted/30 px-3 py-2 sm:flex-row sm:items-center sm:gap-3">
      <span className="shrink-0 text-xs font-medium text-muted-foreground">
        {label}
      </span>
      <code className="min-w-0 flex-1 truncate font-mono text-xs">{url}</code>
      <div className="flex gap-1">
        <Button type="button" variant="ghost" size="sm" onClick={onCopy}>
          <Copy className="size-3.5" />
        </Button>
        <Button type="button" variant="ghost" size="sm" asChild>
          <a href={url} target="_blank" rel="noreferrer">
            <ExternalLink className="size-3.5" />
          </a>
        </Button>
      </div>
    </div>
  );
}

function csvEscape(v: string): string {
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

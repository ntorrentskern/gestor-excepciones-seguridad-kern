"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { AppWindow, Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { searchServiciosAction } from "@/lib/sujetos/actions";
import {
  displayNameServicio,
  normalizeServicioClave,
  type SujetoConStats,
  type SujetoInput,
} from "@/types/sujeto";
import { cn } from "@/lib/utils";

type Props = {
  value: SujetoInput[];
  onChange: (next: SujetoInput[]) => void;
  hint?: string;
};

export function ServiciosPicker({ value, onChange, hint }: Props) {
  const listId = useId();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SujetoConStats[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedKeys = useMemo(
    () =>
      new Set(
        value.map((s) => normalizeServicioClave(s.clave || s.display_name || ""))
      ),
    [value]
  );
  const selectedKeyList = useMemo(
    () => Array.from(selectedKeys).sort().join("|"),
    [selectedKeys]
  );

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void (async () => {
        setLoading(true);
        try {
          const rows = await searchServiciosAction(query);
          const skip = new Set(selectedKeyList.split("|").filter(Boolean));
          setSuggestions(
            rows.filter((r) => !skip.has(normalizeServicioClave(r.clave)))
          );
        } catch {
          setSuggestions([]);
        } finally {
          setLoading(false);
        }
      })();
    }, 180);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, selectedKeyList]);

  function addServicio(raw: string, existing?: SujetoConStats) {
    const clave = normalizeServicioClave(existing?.clave || raw);
    if (!clave || selectedKeys.has(clave)) {
      setQuery("");
      setOpen(false);
      return;
    }
    const display = existing
      ? existing.display_name || displayNameServicio(raw)
      : displayNameServicio(raw);
    onChange([
      ...value,
      {
        tipo: "servicio",
        clave,
        display_name: display,
        auto: true,
      },
    ]);
    setQuery("");
    setOpen(false);
  }

  function removeAt(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      const first = suggestions[0];
      if (first && query.trim()) {
        addServicio(first.display_name || first.clave, first);
        return;
      }
      if (query.trim()) addServicio(query);
    }
    if (e.key === "Escape") setOpen(false);
  }

  return (
    <div className="space-y-2" ref={wrapRef}>
      <Label className="flex items-center gap-1.5">
        <AppWindow className="size-3.5 text-muted-foreground" aria-hidden />
        Servicios excepcionados
      </Label>

      {value.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {value.map((s, index) => (
            <span
              key={`${s.clave}-${index}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-violet-300/60 bg-violet-500/10 px-2.5 py-1 text-sm text-violet-950 dark:border-violet-500/40 dark:text-violet-100"
            >
              {s.display_name || s.clave}
              <button
                type="button"
                onClick={() => removeAt(index)}
                className="rounded p-0.5 hover:bg-violet-500/20"
                aria-label={`Quitar ${s.display_name || s.clave}`}
              >
                <X className="size-3.5" />
              </button>
            </span>
          ))}
        </div>
      ) : null}

      <div className="relative">
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Nombre del servicio…"
          className="h-11"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
        />
        {open ? (
          <div
            id={listId}
            role="listbox"
            className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-border bg-card py-1 shadow-lg"
          >
            {loading ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">
                Buscando…
              </p>
            ) : null}
            {!loading && suggestions.length === 0 && query.trim() ? (
              <button
                type="button"
                role="option"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                onClick={() => addServicio(query)}
              >
                <Plus className="size-4 shrink-0 text-primary" aria-hidden />
                  <span>Crear «{displayNameServicio(query)}»</span>
              </button>
            ) : null}
            {suggestions.map((s) => (
              <button
                key={s.id}
                type="button"
                role="option"
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                onClick={() => addServicio(s.display_name || s.clave, s)}
              >
                <span className="min-w-0">
                  <span className="block font-medium">{s.display_name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {s.clave}
                    {s.activas > 0 ? ` · ${s.activas} activas` : ""}
                  </span>
                </span>
              </button>
            ))}
            {!loading &&
            suggestions.length > 0 &&
            query.trim() &&
            !suggestions.some(
              (s) =>
                normalizeServicioClave(s.clave) ===
                normalizeServicioClave(query)
            ) ? (
              <button
                type="button"
                role="option"
                className={cn(
                  "flex w-full items-center gap-2 border-t border-border px-3 py-2 text-left text-sm hover:bg-muted"
                )}
                onClick={() => addServicio(query)}
              >
                <Plus className="size-4 shrink-0 text-primary" aria-hidden />
                Crear «{displayNameServicio(query)}»
              </button>
            ) : null}
            {!loading && !query.trim() && suggestions.length === 0 ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">
                Sin sugerencias.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
      {hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

"use client";

import { useState } from "react";
import { Laptop, Plus, Tag, User, X } from "lucide-react";
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
  TIPOS_SUJETO,
  TIPO_SUJETO_LABELS,
  type SujetoInput,
  type TipoSujeto,
} from "@/types/sujeto";
import { cn } from "@/lib/utils";

type Props = {
  /** Vínculos automáticos (Usuario / Activo desde campos). */
  autoItems?: SujetoInput[];
  /** Solo vínculos manuales (típicamente «Otro»). */
  value: SujetoInput[];
  onChange: (next: SujetoInput[]) => void;
  /** Si true, el picker solo ofrece «Otro» (recomendado en alta). */
  soloOtro?: boolean;
  className?: string;
};

function Chip({
  item,
  onRemove,
}: {
  item: SujetoInput;
  onRemove?: () => void;
}) {
  const Icon =
    item.tipo === "usuario" ? User : item.tipo === "activo" ? Laptop : Tag;
  return (
    <li
      className={cn(
        "inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs transition-colors",
        item.auto
          ? "border-primary/25 bg-primary/8 text-foreground"
          : "border-border bg-muted/50"
      )}
    >
      <Icon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
      <span className="font-medium text-muted-foreground">
        {TIPO_SUJETO_LABELS[item.tipo]}
      </span>
      <span className="max-w-[180px] truncate">{item.display_name || item.clave}</span>
      {item.auto ? (
        <span className="rounded-md bg-background/60 px-1 text-[10px] uppercase tracking-wide text-muted-foreground">
          auto
        </span>
      ) : null}
      {onRemove ? (
        <button
          type="button"
          className="rounded-md p-0.5 hover:bg-background"
          onClick={onRemove}
          aria-label="Quitar vínculo"
        >
          <X className="size-3" />
        </button>
      ) : null}
    </li>
  );
}

export function SujetosPicker({
  autoItems = [],
  value,
  onChange,
  soloOtro = false,
  className,
}: Props) {
  const [tipo, setTipo] = useState<TipoSujeto>(soloOtro ? "otro" : "otro");
  const [clave, setClave] = useState("");

  const tiposDisponibles = soloOtro
    ? (["otro"] as TipoSujeto[])
    : TIPOS_SUJETO;

  function add() {
    const raw = clave.trim();
    if (!raw) return;
    const nextTipo = soloOtro ? "otro" : tipo;
    const exists =
      value.some(
        (s) =>
          s.tipo === nextTipo &&
          s.clave.trim().toLowerCase() === raw.toLowerCase()
      ) ||
      autoItems.some(
        (s) =>
          s.tipo === nextTipo &&
          s.clave.trim().toLowerCase() === raw.toLowerCase()
      );
    if (exists) {
      setClave("");
      return;
    }
    onChange([
      ...value,
      { tipo: nextTipo, clave: raw, display_name: raw, auto: false },
    ]);
    setClave("");
  }

  function remove(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  const hasAny = autoItems.length > 0 || value.length > 0;

  return (
    <div className={cn("space-y-3", className)}>
      <div>
        <Label>Vínculos</Label>
        <p className="mt-1 text-xs text-muted-foreground">
          Usuario y Activo se crean solos desde el titular y su equipo.
          Aquí solo añades vínculos «Otro» (ticket, ubicación…).
        </p>
      </div>

      {hasAny ? (
        <ul className="flex flex-wrap gap-2">
          {autoItems.map((s, index) => (
            <Chip key={`auto-${s.tipo}-${s.clave}-${index}`} item={s} />
          ))}
          {value.map((s, index) => (
            <Chip
              key={`manual-${s.tipo}-${s.clave}-${index}`}
              item={s}
              onRemove={() => remove(index)}
            />
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
          Todavía no hay vínculos. Escribe un usuario o equipo afectado.
        </p>
      )}

      <div className="grid gap-2 sm:grid-cols-[140px_1fr_auto]">
        <Select
          value={tipo}
          onValueChange={(v) => setTipo(v as TipoSujeto)}
          disabled={soloOtro}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {tiposDisponibles.map((t) => (
              <SelectItem key={t} value={t}>
                {TIPO_SUJETO_LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          value={clave}
          onChange={(e) => setClave(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={
            soloOtro
              ? "Ticket, ubicación, grupo…"
              : "email, hostname, IP…"
          }
        />
        <Button type="button" variant="outline" onClick={add}>
          <Plus className="size-4" />
          Añadir
        </Button>
      </div>
    </div>
  );
}

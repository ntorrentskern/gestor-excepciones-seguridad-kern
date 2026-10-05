"use client";

import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  listAprobadoresAction,
  type AprobadorOption,
} from "@/lib/auth/aprobadores";
import { APROBADOR_OTRA_OPCION } from "@/types/excepcion";
import type { Dominio } from "@/types/dominio";

type Props = {
  value: string;
  otroValue?: string;
  onChange: (opcion: string) => void;
  onOtroChange?: (value: string) => void;
  dominio?: Dominio;
  label?: string;
  id?: string;
};

export function AprobadorSelect({
  value,
  otroValue = "",
  onChange,
  onOtroChange,
  dominio,
  label = "Registrador / aprobador",
  id = "aprobador",
}: Props) {
  const [options, setOptions] = useState<AprobadorOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void listAprobadoresAction(dominio)
      .then((list) => {
        if (!cancelled) {
          setOptions(list);
          if (
            list.length > 0 &&
            value !== APROBADOR_OTRA_OPCION &&
            !list.some((o) => o.email === value)
          ) {
            onChange(list[0].email);
          }
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo recargar al cambiar dominio
  }, [dominio]);

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor={id}>{label}</Label>
        <Select
          value={value}
          onValueChange={onChange}
          disabled={loading && options.length === 0}
        >
          <SelectTrigger id={id} className="w-full">
            <SelectValue
              placeholder={loading ? "Cargando…" : "Seleccionar"}
            />
          </SelectTrigger>
          <SelectContent>
            {options.map((o) => (
              <SelectItem key={o.email} value={o.email}>
                {o.label}
                {o.label !== o.email ? ` (${o.email})` : ""}
              </SelectItem>
            ))}
            <SelectItem value={APROBADOR_OTRA_OPCION}>Otra opción</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {value === APROBADOR_OTRA_OPCION ? (
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor={`${id}-otro`}>Correo o nombre</Label>
          <Input
            id={`${id}-otro`}
            required
            value={otroValue}
            onChange={(e) => onOtroChange?.(e.target.value)}
            placeholder="nombre@empresa.com o Nombre Apellido"
          />
        </div>
      ) : null}
    </>
  );
}

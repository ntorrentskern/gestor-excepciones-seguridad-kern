import { Suspense } from "react";
import { NuevaExcepcionForm } from "@/components/excepciones/nueva-excepcion-form";

export default function NuevaExcepcionPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          Alta de excepción
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Usuario afectado = titular del equipo. Si otro lo pide, usa «Solicitado
          por».
        </p>
      </div>

      <Suspense
        fallback={
          <p className="text-sm text-muted-foreground">Cargando formulario…</p>
        }
      >
        <NuevaExcepcionForm />
      </Suspense>
    </div>
  );
}

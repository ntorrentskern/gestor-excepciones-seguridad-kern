import { NuevaExcepcionForm } from "@/components/excepciones/nueva-excepcion-form";

export default function NuevaExcepcionPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          Alta de excepción
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Registra una nueva excepción de seguridad para seguimiento OTS.
        </p>
      </div>

      <NuevaExcepcionForm />
    </div>
  );
}

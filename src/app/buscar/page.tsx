import { Suspense } from "react";
import { BuscadorAvanzado } from "@/components/search/buscador-avanzado";

export default function BuscarPage() {
  return (
    <Suspense
      fallback={<p className="text-sm text-muted-foreground">Cargando buscador…</p>}
    >
      <BuscadorAvanzado />
    </Suspense>
  );
}

import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExcepcionesTable } from "@/components/excepciones/excepciones-table";

export default function ExcepcionesPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            Excepciones
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Inventario completo con filtros por estado y tipo.
          </p>
        </div>
        <Button asChild>
          <Link href="/excepciones/nueva">
            <PlusCircle className="size-4" />
            Nueva excepción
          </Link>
        </Button>
      </div>

      <ExcepcionesTable />
    </div>
  );
}

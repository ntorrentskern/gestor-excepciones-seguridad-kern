import { Suspense } from "react";
import { CmdbExplorer } from "@/components/cmdb/cmdb-explorer";

export default function CmdbPage() {
  return (
    <Suspense
      fallback={
        <p className="text-sm text-muted-foreground">Cargando CMDB…</p>
      }
    >
      <CmdbExplorer />
    </Suspense>
  );
}

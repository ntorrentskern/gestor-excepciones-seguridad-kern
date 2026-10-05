import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardStats } from "@/components/dashboard/dashboard-stats";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { ProximasRevisionList } from "@/components/dashboard/proximas-revision-list";

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            Panel de control
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Resumen global por dominio (Seguridad, Sistemas, Helpdesk),
            revisiones próximas y actividad reciente.
          </p>
        </div>
        <Button asChild>
          <Link href="/excepciones/nueva">
            <PlusCircle className="size-4" />
            Nueva excepción
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <DashboardStats />
          <ProximasRevisionList />
        </div>
        <div className="xl:sticky xl:top-24 xl:self-start">
          <ActivityFeed />
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";
import { FlaskConical, Users } from "lucide-react";
import { AjustesPerfilForm } from "@/components/ajustes/ajustes-perfil-form";
import { requireCurrentUser } from "@/lib/auth/session-user";
import { canAccessSandbox } from "@/lib/sandbox/config";
import { canManageUsers } from "@/types/roles";

export default async function AjustesPage() {
  const user = await requireCurrentUser();
  const showAdmin = canManageUsers(user.rol);
  const showDemo = canAccessSandbox(user.email);

  return (
    <div className="mx-auto w-full max-w-[1100px] space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          Ajustes
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Perfil, contraseña y accesos de administración.
        </p>
      </div>

      {showAdmin || showDemo ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {showAdmin ? (
            <Link
              href="/admin/usuarios"
              className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-muted/30"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Users className="size-5" aria-hidden />
              </div>
              <span>
                <span className="block text-sm font-semibold">
                  Gestión de usuarios
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  Roles, altas y restablecer contraseñas.
                </span>
              </span>
            </Link>
          ) : null}
          {showDemo ? (
            <Link
              href="/demo"
              className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-amber-500/40 hover:bg-amber-500/5"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-800 dark:text-amber-200">
                <FlaskConical className="size-5" aria-hidden />
              </div>
              <span>
                <span className="block text-sm font-semibold">Modo demo</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  Entorno aislado para demostraciones.
                </span>
              </span>
            </Link>
          ) : null}
        </div>
      ) : null}

      <AjustesPerfilForm />
    </div>
  );
}

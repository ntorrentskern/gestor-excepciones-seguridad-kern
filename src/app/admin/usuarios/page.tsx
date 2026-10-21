import { AdminUsuariosPanel } from "@/components/admin/admin-usuarios-panel";

export default function AdminUsuariosPage() {
  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          Administración de usuarios
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Roles locales (Seguridad = admin). Más adelante se mapearán desde
          Microsoft Entra ID.
        </p>
      </div>
      <AdminUsuariosPanel />
    </div>
  );
}

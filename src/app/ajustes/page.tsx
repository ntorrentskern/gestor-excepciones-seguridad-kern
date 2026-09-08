import { AjustesPerfilForm } from "@/components/ajustes/ajustes-perfil-form";

export default function AjustesPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          Ajustes
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Perfil del usuario con sesión iniciada.
        </p>
      </div>
      <AjustesPerfilForm />
    </div>
  );
}

"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getCurrentUser,
  updateProfileAction,
} from "@/lib/auth/actions";
import type { UsuarioPublico } from "@/lib/auth/users";

export function AjustesPerfilForm() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UsuarioPublico | null>(null);
  const [nombre, setNombre] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const current = await getCurrentUser();
        if (current) {
          setUser(current);
          setNombre(current.nombre);
          setApellidos(current.apellidos);
          setEmail(current.email);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setOkMsg(null);
    setSaving(true);
    try {
      const result = await updateProfileAction({
        nombre,
        apellidos,
        email,
        currentPassword: currentPassword || undefined,
        newPassword: newPassword || undefined,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setUser(result.user);
      setNombre(result.user.nombre);
      setApellidos(result.user.apellidos);
      setEmail(result.user.email);
      setCurrentPassword("");
      setNewPassword("");
      setOkMsg("Cambios guardados correctamente.");
    } catch {
      setError("No se pudieron guardar los cambios.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <p className="text-sm text-muted-foreground">Cargando perfil…</p>
    );
  }

  if (!user) {
    return (
      <p className="text-sm text-rose-700">
        No se pudo cargar el perfil. Vuelve a iniciar sesión.
      </p>
    );
  }

  return (
    <Card className="mx-auto max-w-2xl shadow-none">
      <CardHeader>
        <CardTitle className="text-base">Perfil de usuario</CardTitle>
        <CardDescription>
          Actualiza tus datos. Los cambios se aplican todos al pulsar Guardar.
        </CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre</Label>
            <Input
              id="nombre"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="apellidos">Apellidos</Label>
            <Input
              id="apellidos"
              required
              value={apellidos}
              onChange={(e) => setApellidos(e.target.value)}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="email">Correo</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <p className="text-sm font-medium text-foreground">
              Cambiar contraseña
            </p>
            <p className="text-xs text-muted-foreground">
              Déjalo vacío si no quieres cambiarla. Si la cambias, indica la
              actual y la nueva.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="current-password">Contraseña actual</Label>
            <div className="relative">
              <Input
                id="current-password"
                type={showCurrent ? "text" : "password"}
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="pr-10"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowCurrent((v) => !v)}
                className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label={
                  showCurrent ? "Ocultar contraseña" : "Ver contraseña"
                }
              >
                {showCurrent ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-password">Nueva contraseña</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showNew ? "text" : "password"}
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="pr-10"
                placeholder="Mín. 8 caracteres"
              />
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label={showNew ? "Ocultar contraseña" : "Ver contraseña"}
              >
                {showNew ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
          </div>

          {error ? (
            <p className="sm:col-span-2 text-sm text-rose-700" role="alert">
              {error}
            </p>
          ) : null}
          {okMsg ? (
            <p className="sm:col-span-2 text-sm text-emerald-700 dark:text-emerald-400">
              {okMsg}
            </p>
          ) : null}
        </CardContent>
        <CardFooter className="justify-end border-t border-border/70">
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Guardando…
              </>
            ) : (
              "Guardar cambios"
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

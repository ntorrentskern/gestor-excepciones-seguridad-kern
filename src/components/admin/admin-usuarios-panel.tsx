"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { KeyRound, Plus, RefreshCw, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/context/auth-context";
import {
  createUsuarioAction,
  listUsuariosAction,
  resetPasswordUsuarioAction,
  updateUsuarioAction,
} from "@/lib/auth/admin-actions";
import type { UsuarioPublico } from "@/lib/auth/users";
import { ROL_LABELS, ROLES, type Rol } from "@/types/roles";

export function AdminUsuariosPanel() {
  const { can, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<UsuarioPublico[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [createForm, setCreateForm] = useState({
    email: "",
    nombre: "",
    apellidos: "",
    rol: "helpdesk" as Rol,
    password: "",
  });

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listUsuariosAction();
      setUsers(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudieron cargar usuarios"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!can("manage_users")) return;
    void refresh();
  }, [authLoading, can, refresh]);

  if (!authLoading && !can("manage_users")) {
    return (
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="size-5" />
            Acceso restringido
          </CardTitle>
          <CardDescription>
            Solo Seguridad (admin) puede gestionar usuarios y roles. Cuando
            conectéis Entra ID, los roles vendrán de grupos de Microsoft.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setBusyId("create");
    setError(null);
    setOkMsg(null);
    const result = await createUsuarioAction(createForm);
    setBusyId(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOkMsg(`Usuario ${result.user.email} creado.`);
    setCreateForm({
      email: "",
      nombre: "",
      apellidos: "",
      rol: "helpdesk",
      password: "",
    });
    await refresh();
  }

  async function onSaveUser(user: UsuarioPublico) {
    setBusyId(user.id);
    setError(null);
    setOkMsg(null);
    const result = await updateUsuarioAction({
      id: user.id,
      email: user.email,
      nombre: user.nombre,
      apellidos: user.apellidos,
      rol: user.rol,
      activo: user.activo,
    });
    setBusyId(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOkMsg(`Usuario ${result.user.email} actualizado.`);
    await refresh();
  }

  async function onResetPassword(user: UsuarioPublico) {
    const pwd = window.prompt(
      `Nueva contraseña temporal para ${user.email} (mín. 8 caracteres):`
    );
    if (!pwd) return;
    setBusyId(`pwd-${user.id}`);
    setError(null);
    setOkMsg(null);
    const result = await resetPasswordUsuarioAction({
      id: user.id,
      newPassword: pwd,
    });
    setBusyId(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOkMsg(`Contraseña restablecida para ${user.email}.`);
  }

  function patchUser(id: string, patch: Partial<UsuarioPublico>) {
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, ...patch } : u))
    );
  }

  return (
    <div className="space-y-6">
      {okMsg ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
          {okMsg}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800" role="alert">
          {error}
        </p>
      ) : null}

      <Card className="shadow-none">
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Usuarios</CardTitle>
            <CardDescription>
              Gestión local hasta SSO con Microsoft Entra ID.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void refresh()}
            disabled={loading}
          >
            <RefreshCw className="size-4" />
            Actualizar
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="p-6 text-sm text-muted-foreground">Cargando…</p>
          ) : (
            <div className="overflow-x-auto px-2">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-4">Nombre</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Activo</TableHead>
                    <TableHead className="pr-4 text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="pl-4">
                        <div className="flex flex-col gap-1">
                          <Input
                            value={u.nombre}
                            onChange={(e) =>
                              patchUser(u.id, { nombre: e.target.value })
                            }
                            className="h-8"
                          />
                          <Input
                            value={u.apellidos}
                            onChange={(e) =>
                              patchUser(u.id, { apellidos: e.target.value })
                            }
                            className="h-8"
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                          value={u.email}
                          onChange={(e) =>
                            patchUser(u.id, { email: e.target.value })
                          }
                          className="h-8 min-w-[200px]"
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={u.rol}
                          onValueChange={(v) =>
                            patchUser(u.id, { rol: v as Rol })
                          }
                        >
                          <SelectTrigger className="h-8 w-[180px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLES.map((r) => (
                              <SelectItem key={r} value={r}>
                                {ROL_LABELS[r]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={u.activo ? "si" : "no"}
                          onValueChange={(v) =>
                            patchUser(u.id, { activo: v === "si" })
                          }
                        >
                          <SelectTrigger className="h-8 w-[100px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="si">Sí</SelectItem>
                            <SelectItem value="no">No</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="pr-4">
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={busyId === u.id}
                            onClick={() => void onSaveUser(u)}
                          >
                            Guardar
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={busyId === `pwd-${u.id}`}
                            onClick={() => void onResetPassword(u)}
                          >
                            <KeyRound className="size-4" />
                            Reset pwd
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Crear usuario</CardTitle>
          <CardDescription>
            Asigna rol Helpdesk, Sistemas o Seguridad (admin).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={onCreate}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            <div className="space-y-2">
              <Label htmlFor="new-nombre">Nombre</Label>
              <Input
                id="new-nombre"
                required
                value={createForm.nombre}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, nombre: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-apellidos">Apellidos</Label>
              <Input
                id="new-apellidos"
                required
                value={createForm.apellidos}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, apellidos: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-email">Email</Label>
              <Input
                id="new-email"
                type="email"
                required
                value={createForm.email}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, email: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-rol">Rol</Label>
              <Select
                value={createForm.rol}
                onValueChange={(v) =>
                  setCreateForm((f) => ({ ...f, rol: v as Rol }))
                }
              >
                <SelectTrigger id="new-rol" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROL_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">Contraseña temporal</Label>
              <Input
                id="new-password"
                type="password"
                required
                minLength={8}
                value={createForm.password}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, password: e.target.value }))
                }
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={busyId === "create"}>
                <Plus className="size-4" />
                Crear usuario
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

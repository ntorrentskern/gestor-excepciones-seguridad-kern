import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/actions";
import type { UsuarioPublico } from "@/lib/auth/users";

/** Usuario autenticado y activo, o redirect a login. */
export async function requireCurrentUser(): Promise<UsuarioPublico> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

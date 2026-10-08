/** Acceso al entorno de demostración (sandbox) sin mezclar datos reales. */

export const SANDBOX_COOKIE = "ge_sandbox";

/** Solo este usuario ve y usa el entorno de prueba. */
export const SANDBOX_ALLOWED_EMAILS = [
  "ntorrents_sirt@kernpharma.com",
] as const;

export function canAccessSandbox(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return (SANDBOX_ALLOWED_EMAILS as readonly string[]).includes(normalized);
}

export const SANDBOX_DOMINIO_PREFIX = {
  seguridad: "DEMO-SEG-",
  sistemas: "DEMO-SIS-",
  helpdesk: "DEMO-HD-",
} as const;

/** Usuario / PC de demo para correlaciones y operaciones. */
export const SANDBOX_DEMO = {
  usuario: {
    tipo: "usuario" as const,
    clave: "demo.maria.lopez@kernpharma.demo",
    display_name: "María López (DEMO)",
  },
  pc: {
    tipo: "activo" as const,
    clave: "demo-laptop-maria",
    display_name: "DEMO-LAPTOP-MARIA",
  },
  pcNuevo: {
    tipo: "activo" as const,
    clave: "demo-laptop-maria-02",
    display_name: "DEMO-LAPTOP-MARIA-02",
  },
};

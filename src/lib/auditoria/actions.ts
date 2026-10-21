"use server";

import { requireCurrentUser } from "@/lib/auth/session-user";
import { resolveSandboxFilter } from "@/lib/sandbox/actions";
import {
  listAuditoriaGlobal,
  type AuditoriaEventoRow,
  type AuditoriaFilters,
} from "@/lib/auditoria/repository";

export async function listAuditoriaAction(
  filters: Omit<AuditoriaFilters, "is_sandbox"> = {}
): Promise<{ items: AuditoriaEventoRow[]; total: number }> {
  await requireCurrentUser();
  const sandboxMode = (await resolveSandboxFilter()) ?? false;
  return listAuditoriaGlobal({ ...filters, is_sandbox: sandboxMode });
}

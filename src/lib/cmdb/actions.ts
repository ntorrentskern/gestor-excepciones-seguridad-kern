"use server";

import { requireCurrentUser } from "@/lib/auth/session-user";
import { resolveSandboxFilter } from "@/lib/sandbox/actions";
import {
  cmdbRowsToCsv,
  getCmdbCounts,
  getCmdbFicha,
  getSujetoTipoById,
  listCmdbMatrix,
  unlinkSujetoFromExcepcion,
} from "@/lib/cmdb/repository";
import type {
  CmdbCounts,
  CmdbFicha,
  CmdbListFilters,
  CmdbListResult,
} from "@/types/cmdb";

export async function listCmdbMatrixAction(
  filters: Omit<CmdbListFilters, "is_sandbox"> = {}
): Promise<CmdbListResult> {
  await requireCurrentUser();
  const sandboxMode = (await resolveSandboxFilter()) ?? false;
  return listCmdbMatrix({ ...filters, is_sandbox: sandboxMode });
}

export async function getCmdbCountsAction(): Promise<CmdbCounts> {
  await requireCurrentUser();
  const sandboxMode = (await resolveSandboxFilter()) ?? false;
  return getCmdbCounts(sandboxMode);
}

export async function getCmdbFichaAction(
  sujetoId: string
): Promise<CmdbFicha | null> {
  await requireCurrentUser();
  const sandboxMode = (await resolveSandboxFilter()) ?? false;
  return getCmdbFicha(sujetoId, sandboxMode);
}

export async function resolveCmdbTipoAction(
  sujetoId: string
): Promise<string | null> {
  await requireCurrentUser();
  return getSujetoTipoById(sujetoId);
}

export async function exportCmdbCsvAction(
  filters: Omit<CmdbListFilters, "is_sandbox" | "page" | "pageSize"> = {}
): Promise<string> {
  await requireCurrentUser();
  const sandboxMode = (await resolveSandboxFilter()) ?? false;
  const result = await listCmdbMatrix({
    ...filters,
    is_sandbox: sandboxMode,
    page: 1,
    pageSize: 5000,
  });
  return cmdbRowsToCsv(result.rows);
}

export async function unlinkCmdbSujetoAction(
  excepcionId: string,
  sujetoId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireCurrentUser();
  try {
    await unlinkSujetoFromExcepcion(excepcionId, sujetoId);
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "No se pudo desvincular",
    };
  }
}

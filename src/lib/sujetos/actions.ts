"use server";

import { requireCurrentUser } from "@/lib/auth/session-user";
import { resolveSandboxFilter } from "@/lib/sandbox/actions";
import {
  getSujetoById,
  globalSearch,
  listExcepcionesBySujeto,
  listSujetosByExcepcion,
  listSujetosRelacionados,
  searchSujetos,
  type ExcepcionResumenSujeto,
} from "@/lib/sujetos/repository";
import type { GlobalSearchResult, Sujeto, SujetoConStats } from "@/types/sujeto";

export async function searchGlobalAction(
  query: string
): Promise<GlobalSearchResult> {
  await requireCurrentUser();
  const sandboxMode = (await resolveSandboxFilter()) ?? false;
  return globalSearch(query, sandboxMode);
}

export async function searchSujetosAction(
  query: string
): Promise<SujetoConStats[]> {
  await requireCurrentUser();
  const sandboxMode = (await resolveSandboxFilter()) ?? false;
  return searchSujetos(query, 20, sandboxMode);
}

export async function getSujetoFichaAction(id: string): Promise<{
  sujeto: Sujeto;
  excepciones: ExcepcionResumenSujeto[];
  relacionados: SujetoConStats[];
} | null> {
  await requireCurrentUser();
  const sujeto = await getSujetoById(id);
  if (!sujeto) return null;
  const [excepciones, relacionados] = await Promise.all([
    listExcepcionesBySujeto(id),
    listSujetosRelacionados(id),
  ]);
  return { sujeto, excepciones, relacionados };
}

export async function listSujetosDeExcepcionAction(
  excepcionId: string
): Promise<Sujeto[]> {
  await requireCurrentUser();
  return listSujetosByExcepcion(excepcionId);
}

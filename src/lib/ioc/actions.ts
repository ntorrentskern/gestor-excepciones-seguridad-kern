"use server";

import { requireCurrentUser } from "@/lib/auth/session-user";
import {
  bulkImportIocs,
  createIoc,
  deleteIoc,
  deleteIocsByIds,
  getIocStats,
  listIocs,
  updateIoc,
  type BulkImportResult,
} from "@/lib/ioc/repository";
import type { Ioc, IocInput, IocStats, TipoIoc } from "@/types/ioc";
import { parseIocBulk } from "@/types/ioc";

export async function listIocsAction(
  tipo: TipoIoc,
  q?: string
): Promise<Ioc[]> {
  await requireCurrentUser();
  return listIocs(tipo, { q });
}

export async function createIocAction(
  tipo: TipoIoc,
  input: IocInput
): Promise<Ioc> {
  await requireCurrentUser();
  return createIoc(tipo, input);
}

export async function updateIocAction(
  id: string,
  input: IocInput
): Promise<Ioc> {
  await requireCurrentUser();
  return updateIoc(id, input);
}

export async function deleteIocAction(id: string): Promise<void> {
  await requireCurrentUser();
  await deleteIoc(id);
}

export async function deleteIocsBulkAction(ids: string[]): Promise<number> {
  await requireCurrentUser();
  return deleteIocsByIds(ids);
}

export async function importIocsBulkAction(
  tipo: TipoIoc,
  raw: string,
  fuente?: string
): Promise<BulkImportResult> {
  await requireCurrentUser();
  const valores = parseIocBulk(raw);
  return bulkImportIocs(tipo, valores, {
    fuente: fuente?.trim() || "import bulk",
  });
}

export async function getIocStatsAction(): Promise<IocStats> {
  await requireCurrentUser();
  return getIocStats();
}

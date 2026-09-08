import { neon } from "@neondatabase/serverless";

/**
 * Cliente SQL de Neon (HTTP/serverless).
 * Usar solo en Server Components, Route Handlers o Server Actions.
 *
 * Local: DATABASE_URL (.env.local)
 * Vercel (Neon/Storage): STORAGE_DATABASE_URL
 */
function resolveDatabaseUrl(): string {
  const databaseUrl =
    process.env.DATABASE_URL ?? process.env.STORAGE_DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      "Falta la URL de Neon: define DATABASE_URL o STORAGE_DATABASE_URL"
    );
  }

  return databaseUrl;
}

export const sql = neon(resolveDatabaseUrl());

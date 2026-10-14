import postgres from "postgres";

/**
 * Cliente SQL (postgres.js) compatible con Postgres local y con Neon vía TCP.
 * Usar solo en Server Components, Route Handlers o Server Actions.
 *
 * Local / Docker: DATABASE_URL
 * Vercel (Neon/Storage): STORAGE_DATABASE_URL o DATABASE_URL
 */
function resolveDatabaseUrl(): string {
  const databaseUrl =
    process.env.DATABASE_URL ?? process.env.STORAGE_DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      "Falta la URL de Postgres: define DATABASE_URL o STORAGE_DATABASE_URL"
    );
  }

  return databaseUrl;
}

type SqlClient = ReturnType<typeof postgres>;

/** Misma API de plantillas que Neon; admite null/undefined en parámetros. */
type SqlTag = {
  (
    strings: TemplateStringsArray,
    ...values: readonly unknown[]
  ): Promise<Record<string, unknown>[]>;
} & SqlClient;

const globalForSql = globalThis as unknown as {
  __gestorSql?: SqlTag;
};

function createSql(): SqlTag {
  return postgres(resolveDatabaseUrl(), {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    // Evita problemas con PgBouncer / Neon pooled.
    prepare: false,
  }) as unknown as SqlTag;
}

export const sql = globalForSql.__gestorSql ?? createSql();

if (process.env.NODE_ENV !== "production") {
  globalForSql.__gestorSql = sql;
}

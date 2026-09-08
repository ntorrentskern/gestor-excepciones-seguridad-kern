import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function DbTestPage() {
  let ok = false;
  let now: string | null = null;
  let errorMessage: string | null = null;

  try {
    const result = await sql`SELECT NOW() as now`;
    now = result[0]?.now?.toString() ?? null;
    ok = Boolean(now);
  } catch (error) {
    errorMessage =
      error instanceof Error ? error.message : "Error desconocido al conectar";
  }

  return (
    <main className="mx-auto max-w-lg p-8 font-sans">
      <h1 className="mb-4 text-2xl font-semibold">Prueba de conexión Neon</h1>
      {ok ? (
        <p className="text-green-700 dark:text-green-400">
          Conexión establecida. Fecha DB: {now}
        </p>
      ) : (
        <p className="text-red-700 dark:text-red-400">
          Fallo de conexión: {errorMessage}
        </p>
      )}
    </main>
  );
}

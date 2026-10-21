import { listFeedValores } from "@/lib/ioc/repository";
import type { TipoIoc } from "@/types/ioc";

/** Valida IOC_FEED_TOKEN si está configurado. */
export function assertFeedToken(request: Request): Response | null {
  const expected = process.env.IOC_FEED_TOKEN?.trim();
  if (!expected) return null;

  const url = new URL(request.url);
  const token =
    url.searchParams.get("token") ??
    request.headers.get("x-ioc-token") ??
    "";

  if (token !== expected) {
    return new Response("Unauthorized", { status: 401 });
  }
  return null;
}

export async function buildTxtFeed(tipo: TipoIoc): Promise<string> {
  const valores = await listFeedValores(tipo);
  return `${valores.join("\n")}${valores.length ? "\n" : ""}`;
}

export async function buildHtmlFeed(tipo: TipoIoc): Promise<string> {
  const valores = await listFeedValores(tipo);
  const title =
    tipo === "ip" ? "IOC — IPs maliciosas" : "IOC — Dominios maliciosos";
  const items = valores
    .map((v) => `<li><code>${escapeHtml(v)}</code></li>`)
    .join("\n");
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <meta name="robots" content="noindex" />
</head>
<body>
  <h1>${title}</h1>
  <p>${valores.length} indicador(es) activos.</p>
  <ul>
${items || "    <li>(vacío)</li>"}
  </ul>
</body>
</html>
`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function txtResponse(body: string): Response {
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, max-age=60",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export function htmlResponse(body: string): Response {
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-cache, max-age=60",
    },
  });
}

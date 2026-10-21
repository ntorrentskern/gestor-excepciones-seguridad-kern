import {
  assertFeedToken,
  buildTxtFeed,
  txtResponse,
} from "@/lib/ioc/feed";

export const dynamic = "force-dynamic";

/** Lista de dominios activos (text/plain, uno por línea) para el firewall. */
export async function GET(request: Request) {
  const denied = assertFeedToken(request);
  if (denied) return denied;
  return txtResponse(await buildTxtFeed("dominio"));
}

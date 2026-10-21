import {
  assertFeedToken,
  buildHtmlFeed,
  htmlResponse,
} from "@/lib/ioc/feed";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = assertFeedToken(request);
  if (denied) return denied;
  return htmlResponse(await buildHtmlFeed("dominio"));
}

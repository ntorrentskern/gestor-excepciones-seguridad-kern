import { notFound, redirect } from "next/navigation";
import { getSujetoTipoById } from "@/lib/cmdb/repository";

/** Redirección legacy: /cmdb/ficha/:id → /cmdb/:tipo/:id */
export default async function CmdbFichaLegacyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tipo = await getSujetoTipoById(id);
  if (!tipo) notFound();
  redirect(`/cmdb/${tipo}/${id}`);
}

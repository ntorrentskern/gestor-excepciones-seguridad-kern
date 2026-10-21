import { notFound, redirect } from "next/navigation";
import { getSujetoTipoById } from "@/lib/cmdb/repository";

export default async function SujetoRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tipo = await getSujetoTipoById(id);
  if (!tipo) notFound();
  redirect(`/cmdb/${tipo}/${id}`);
}

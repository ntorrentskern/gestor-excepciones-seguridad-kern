import { redirect } from "next/navigation";
import { CmdbFicha } from "@/components/cmdb/cmdb-ficha";
import { getSujetoTipoById } from "@/lib/cmdb/repository";

const TIPOS_VALIDOS = new Set(["usuario", "activo", "servicio"]);

export default async function CmdbFichaTipoPage({
  params,
}: {
  params: Promise<{ tipo: string; id: string }>;
}) {
  const { tipo, id } = await params;

  // Si el primer segmento no es un tipo, redirigir vía resolución por id.
  if (!TIPOS_VALIDOS.has(tipo)) {
    redirect(`/cmdb/ficha/${tipo}`);
  }

  const realTipo = await getSujetoTipoById(id);
  if (realTipo && realTipo !== tipo) {
    redirect(`/cmdb/${realTipo}/${id}`);
  }

  // La ficha client-side muestra empty state si el id no existe.
  return <CmdbFicha id={id} />;
}

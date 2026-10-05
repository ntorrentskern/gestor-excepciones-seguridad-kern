import { EventoOperativoDetalleView } from "@/components/operaciones/evento-operativo-panel";

export default async function OperacionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EventoOperativoDetalleView id={id} />;
}

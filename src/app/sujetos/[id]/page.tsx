import { SujetoFicha } from "@/components/sujetos/sujeto-ficha";

export default async function SujetoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SujetoFicha id={id} />;
}

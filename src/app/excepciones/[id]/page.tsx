"use client";

import { ExcepcionDetail } from "@/components/excepciones/excepcion-detail";
import { use } from "react";

export default function ExcepcionDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const decoded = decodeURIComponent(id);

  return <ExcepcionDetail id={decoded} />;
}

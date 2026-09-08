import type { Excepcion } from "@/types/excepcion";

const CSV_HEADERS = [
  "id",
  "tipo_excepcion",
  "origen_peticion",
  "solicitante_email",
  "activo_afectado",
  "justificacion",
  "control_compensatorio",
  "estado",
  "temporalidad",
  "fecha_solicitud",
  "fecha_revision",
  "aprobador_email",
  "fecha_decision",
] as const;

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function cellValue(exc: Excepcion, key: (typeof CSV_HEADERS)[number]): string {
  const raw = exc[key];
  if (raw == null) return "";
  return String(raw);
}

/** Convierte excepciones filtradas a CSV y dispara la descarga en el navegador. */
export function exportExcepcionesToCsv(
  excepciones: Excepcion[],
  filename = `excepciones-${new Date().toISOString().slice(0, 10)}.csv`
): void {
  const lines = [
    CSV_HEADERS.join(","),
    ...excepciones.map((exc) =>
      CSV_HEADERS.map((key) => escapeCsvCell(cellValue(exc, key))).join(",")
    ),
  ];

  const bom = "\uFEFF";
  const blob = new Blob([bom + lines.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

import type { Excepcion } from "@/types/excepcion";

export const CSV_COLUMNS = [
  { key: "id", label: "ID" },
  { key: "dominio", label: "Dominio" },
  { key: "tipo_excepcion", label: "Tipo de excepción" },
  { key: "origen_solicitud", label: "Origen" },
  { key: "jira_ticket_id", label: "Ticket Jira" },
  { key: "solicitante_email", label: "Usuario afectado" },
  { key: "activo_afectado", label: "Equipo / PC" },
  { key: "justificacion", label: "Justificación" },
  { key: "control_compensatorio", label: "Control compensatorio" },
  { key: "estado", label: "Estado" },
  { key: "temporalidad", label: "Temporalidad" },
  { key: "fecha_solicitud", label: "Fecha solicitud" },
  { key: "fecha_revision", label: "Fecha revisión" },
  { key: "aprobador_email", label: "Aprobador" },
  { key: "fecha_decision", label: "Fecha decisión" },
] as const;

export type CsvColumnKey = (typeof CSV_COLUMNS)[number]["key"];

export const ALL_CSV_COLUMN_KEYS: CsvColumnKey[] = CSV_COLUMNS.map((c) => c.key);

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function cellValue(exc: Excepcion, key: CsvColumnKey): string {
  const raw = exc[key];
  if (raw == null) return "";
  return String(raw);
}

/** Convierte excepciones filtradas a CSV y dispara la descarga en el navegador. */
export function exportExcepcionesToCsv(
  excepciones: Excepcion[],
  options?: {
    columns?: CsvColumnKey[];
    filename?: string;
  }
): void {
  const columns =
    options?.columns && options.columns.length > 0
      ? options.columns
      : ALL_CSV_COLUMN_KEYS;
  const filename =
    options?.filename ??
    `excepciones-${new Date().toISOString().slice(0, 10)}.csv`;

  const headerKeys = columns;
  const lines = [
    headerKeys.join(","),
    ...excepciones.map((exc) =>
      headerKeys.map((key) => escapeCsvCell(cellValue(exc, key))).join(",")
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

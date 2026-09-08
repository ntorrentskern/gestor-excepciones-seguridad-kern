import { neon } from "@neondatabase/serverless";
import { seedExcepciones } from "./seed-data.mjs";

const databaseUrl =
  process.env.DATABASE_URL ?? process.env.STORAGE_DATABASE_URL;

if (!databaseUrl) {
  console.error("Falta DATABASE_URL o STORAGE_DATABASE_URL");
  process.exit(1);
}

const sql = neon(databaseUrl);

const ids = seedExcepciones.map((e) => e.id);
console.log(`Insertando ${ids.length} excepciones…`);

await sql`DELETE FROM eventos_auditoria WHERE excepcion_id = ANY(${ids})`;
await sql`DELETE FROM excepciones WHERE id = ANY(${ids})`;

for (const row of seedExcepciones) {
  await sql`
    INSERT INTO excepciones (
      id, tipo_excepcion, origen_solicitud, jira_ticket_id,
      solicitante_email, activo_afectado, justificacion,
      control_compensatorio, estado, temporalidad,
      fecha_solicitud, fecha_revision, aprobador_email, fecha_decision
    ) VALUES (
      ${row.id},
      ${row.tipo_excepcion},
      ${row.origen_solicitud},
      ${row.jira_ticket_id},
      ${row.solicitante_email},
      ${row.activo_afectado},
      ${row.justificacion},
      ${row.control_compensatorio},
      ${row.estado},
      ${row.temporalidad},
      ${row.fecha_solicitud},
      ${row.fecha_revision},
      ${row.aprobador_email},
      ${row.fecha_decision}
    )
  `;

  const eventoId = `aud-${row.id}-seed-1`;
  await sql`
    INSERT INTO eventos_auditoria (
      id, excepcion_id, tipo, actor_email, "timestamp", detalle,
      estado_anterior, estado_nuevo
    ) VALUES (
      ${eventoId},
      ${row.id},
      ${"Creada"},
      ${row.aprobador_email},
      ${`${row.fecha_solicitud}T09:00:00`},
      ${"Carga inicial desde inventario de excepciones."},
      ${null},
      ${row.estado}
    )
  `;

  if (row.estado === "Aprobada" || row.estado === "Cancelada") {
    await sql`
      INSERT INTO eventos_auditoria (
        id, excepcion_id, tipo, actor_email, "timestamp", detalle,
        estado_anterior, estado_nuevo
      ) VALUES (
        ${`aud-${row.id}-seed-2`},
        ${row.id},
        ${row.estado === "Aprobada" ? "Aprobada" : "Cancelada"},
        ${row.aprobador_email},
        ${`${row.fecha_decision ?? row.fecha_solicitud}T12:00:00`},
        ${
          row.estado === "Aprobada"
            ? "Aprobación registrada en inventario histórico."
            : "Cierre registrado en inventario histórico."
        },
        ${"Pendiente"},
        ${row.estado}
      )
    `;
  }

  console.log("OK", row.id, row.tipo_excepcion, row.estado);
}

const count = await sql`SELECT count(*)::int AS n FROM excepciones`;
console.log("Total excepciones en Neon:", count[0].n);

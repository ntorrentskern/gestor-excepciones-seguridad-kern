/**
 * Semilla del entorno de demostración (solo datos is_sandbox=true).
 * Uso: npm run db:seed:sandbox
 * Idempotente: borra demo previa y recrea el set de ejemplo.
 */
import { neon } from "@neondatabase/serverless";
import { randomBytes } from "node:crypto";

const databaseUrl =
  process.env.DATABASE_URL ?? process.env.STORAGE_DATABASE_URL;

if (!databaseUrl) {
  console.error("Falta DATABASE_URL o STORAGE_DATABASE_URL");
  process.exit(1);
}

const sql = neon(databaseUrl);

const ACTOR = "ntorrents_sirt@kernpharma.com";

const DEMO_USER = {
  id: "suj-demo-maria",
  tipo: "usuario",
  clave: "demo.maria.lopez@kernpharma.demo",
  display: "María López (DEMO)",
};

const DEMO_PC = {
  id: "suj-demo-pc-maria",
  tipo: "activo",
  clave: "demo-laptop-maria",
  display: "DEMO-LAPTOP-MARIA",
};

function eid(n) {
  return `evt-demo-${n}-${randomBytes(2).toString("hex")}`;
}

function todayPlus(days) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

console.log("→ Seed sandbox…");

const oldExc = await sql`SELECT id FROM excepciones WHERE is_sandbox = TRUE`;
for (const row of oldExc) {
  await sql`DELETE FROM eventos_auditoria WHERE excepcion_id = ${row.id}`;
  await sql`DELETE FROM excepcion_sujeto WHERE excepcion_id = ${row.id}`;
  try {
    await sql`DELETE FROM evento_operativo_excepcion WHERE excepcion_id = ${row.id}`;
  } catch {
    /* ignore */
  }
}
await sql`DELETE FROM excepciones WHERE is_sandbox = TRUE`;

try {
  const oldOps = await sql`
    SELECT id FROM eventos_operativos
    WHERE sujeto_id IN (SELECT id FROM sujetos WHERE is_sandbox = TRUE)
  `;
  for (const row of oldOps) {
    await sql`DELETE FROM evento_operativo_excepcion WHERE evento_id = ${row.id}`;
    await sql`DELETE FROM eventos_operativos WHERE id = ${row.id}`;
  }
} catch {
  /* tabla puede no existir */
}

await sql`DELETE FROM sujetos WHERE is_sandbox = TRUE`;

async function upsertSujeto(s) {
  await sql`
    INSERT INTO sujetos (id, tipo, clave, display_name, notas, is_sandbox)
    VALUES (
      ${s.id}, ${s.tipo}, ${s.clave}, ${s.display},
      ${"Dato de demostración"}, ${true}
    )
    ON CONFLICT (id) DO UPDATE SET
      tipo = EXCLUDED.tipo,
      clave = EXCLUDED.clave,
      display_name = EXCLUDED.display_name,
      is_sandbox = TRUE,
      updated_at = NOW()
  `;
}

await upsertSujeto(DEMO_USER);
await upsertSujeto(DEMO_PC);

const samples = [
  {
    id: "DEMO-SEG-001",
    dominio: "seguridad",
    tipo: "Dispositivo USB",
    estado: "Aprobada",
    temporalidad: "Temporal",
    revision: todayPlus(90),
    justif: "Pendrive cifrado para intercambio con proveedor (DEMO).",
    control: "USB cifrado + inventario + revisión trimestral.",
  },
  {
    id: "DEMO-SEG-002",
    dominio: "seguridad",
    tipo: "Exclusión de EDR / Antivirus",
    estado: "Aprobada",
    temporalidad: "Temporal",
    revision: todayPlus(60),
    justif: "Excepción temporal de path de aplicación legacy (DEMO).",
    control: "Allowlist acotada + monitorización de alertas.",
  },
  {
    id: "DEMO-SEG-003",
    dominio: "seguridad",
    tipo: "Acceso herramientas IA",
    estado: "Pendiente",
    temporalidad: "Temporal",
    revision: todayPlus(30),
    justif: "Uso de Copilot para documentación interna (DEMO).",
    control: "Sin datos personales / DLP activo.",
  },
  {
    id: "DEMO-SIS-001",
    dominio: "sistemas",
    tipo: "VPN",
    estado: "Aprobada",
    temporalidad: "Permanente",
    revision: todayPlus(365),
    justif: "Acceso VPN split-tunnel para teletrabajo (DEMO).",
    control: "MFA + logs de acceso.",
  },
  {
    id: "DEMO-SIS-002",
    dominio: "sistemas",
    tipo: "Firewall / regla FW",
    estado: "Pendiente",
    temporalidad: "Temporal",
    revision: todayPlus(45),
    justif: "Apertura temporal a IP de mantenimiento (DEMO).",
    control: "Regla con caducidad automática.",
  },
  {
    id: "DEMO-HD-001",
    dominio: "helpdesk",
    tipo: "Instalación de software",
    estado: "Caducada",
    temporalidad: "Temporal",
    revision: todayPlus(-10),
    justif: "Software de firma digital en el puesto (DEMO).",
    control: "Instalación vía Intune.",
  },
];

const solicitud = todayPlus(-40);

for (const s of samples) {
  await sql`
    INSERT INTO excepciones (
      id, dominio, tipo_excepcion, origen_solicitud, jira_ticket_id,
      solicitante_email, activo_afectado, justificacion,
      control_compensatorio, estado, temporalidad,
      fecha_solicitud, fecha_revision, aprobador_email, fecha_decision,
      is_sandbox
    ) VALUES (
      ${s.id},
      ${s.dominio},
      ${s.tipo},
      ${"Jira"},
      ${`DEMO-${s.id}`},
      ${DEMO_USER.clave},
      ${DEMO_PC.display},
      ${s.justif},
      ${s.control},
      ${s.estado},
      ${s.temporalidad},
      ${solicitud},
      ${s.revision},
      ${ACTOR},
      ${s.estado === "Pendiente" ? null : solicitud},
      ${true}
    )
  `;

  await sql`
    INSERT INTO eventos_auditoria (
      id, excepcion_id, tipo, actor_email, detalle, estado_anterior, estado_nuevo
    ) VALUES (
      ${eid(1)}, ${s.id}, ${"Creada"}, ${ACTOR},
      ${"Alta de demostración (sandbox)."},
      ${null}, ${s.estado === "Caducada" ? "Aprobada" : s.estado}
    )
  `;

  if (s.estado === "Aprobada" || s.estado === "Caducada") {
    await sql`
      INSERT INTO eventos_auditoria (
        id, excepcion_id, tipo, actor_email, detalle, estado_anterior, estado_nuevo
      ) VALUES (
        ${eid(2)}, ${s.id}, ${"Aprobada"}, ${ACTOR},
        ${"Aprobación demo."}, ${"Pendiente"}, ${"Aprobada"}
      )
    `;
  }
  if (s.estado === "Caducada") {
    await sql`
      INSERT INTO eventos_auditoria (
        id, excepcion_id, tipo, actor_email, detalle, estado_anterior, estado_nuevo
      ) VALUES (
        ${eid(3)}, ${s.id}, ${"Caducada"}, ${ACTOR},
        ${"Caducada por fecha (DEMO) — útil para ampliar."},
        ${"Aprobada"}, ${"Caducada"}
      )
    `;
  }

  await sql`
    INSERT INTO excepcion_sujeto (excepcion_id, sujeto_id, rol_vinculo)
    VALUES (${s.id}, ${DEMO_USER.id}, ${"afectado"})
    ON CONFLICT DO NOTHING
  `;
  await sql`
    INSERT INTO excepcion_sujeto (excepcion_id, sujeto_id, rol_vinculo)
    VALUES (${s.id}, ${DEMO_PC.id}, ${"afectado"})
    ON CONFLICT DO NOTHING
  `;
}

const count = await sql`
  SELECT count(*)::int AS n FROM excepciones WHERE is_sandbox = TRUE
`;

console.log(
  `OK sandbox: ${count[0].n} excepciones demo vinculadas a ${DEMO_USER.display} / ${DEMO_PC.display}`
);
console.log(
  "Guía rápida: activa Modo demo → ficha María López → Cambio de dispositivo / ampliar DEMO-HD-001."
);

# Gestor de Excepciones de Seguridad

Aplicación web para la Oficina Técnica de Seguridad (OTS): inventario, seguimiento y alta de excepciones corporativas.

## Fase 1 (actual)

- Frontend Next.js + React + Tailwind CSS + shadcn/ui
- Datos en `localStorage`, sembrados desde `src/data/excepciones.mock.json`
- Sin autenticación real ni base de datos

## Arranque

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Estructura relevante

| Ruta | Descripción |
|------|-------------|
| `/` | Dashboard: contadores y alertas de revisión ≤ 14 días |
| `/excepciones` | Tabla con filtros, búsqueda y acceso al detalle |
| `/excepciones/nueva` | Formulario de alta |
| `/excepciones/[id]` | Ficha detalle + acciones OTS + historial de auditoría |

### Acciones OTS (Fase 1, actor simulado)

Desde el detalle se puede **aprobar**, **rechazar**, **ampliar** revisión, **cancelar** y **reactivar**. Cada acción genera un evento en el historial.

Capa de datos preparada para Fase 2:

- Tipos: `src/types/excepcion.ts`
- Mock: `src/data/excepciones.mock.json`
- Repositorio: `src/lib/excepciones/repository.ts` (`ExcepcionesRepository`)
- Estado UI: `src/context/excepciones-context.tsx`

Para integrar Supabase más adelante, implementa la misma interfaz `ExcepcionesRepository` y sustituye la exportación `excepcionesRepository`.

## Fase 2 (planificada)

- Supabase (PostgreSQL)
- SSO Azure AD (sesión ~30 días)
- Despliegue en Vercel

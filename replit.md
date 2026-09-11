# PetCita

Gestor veterinario en español que sincroniza la agenda de la clínica con un flujo de agendamiento conversacional por WhatsApp.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/petcita` — aplicación web React/Vite para dashboard, agenda, pacientes y WhatsApp.
- `artifacts/api-server` — API Express y seed de datos de demostración.
- `lib/api-spec/openapi.yaml` — contrato fuente de la API.
- `lib/db/src/schema` — tablas y esquemas de PostgreSQL.
- `docs/INFORME-PRACTICAS.md` — base técnica y académica para el documento de prácticas.

## Architecture decisions

- Se eligió TypeScript en frontend y backend para compartir contratos y detectar errores durante el desarrollo.
- PostgreSQL almacena la información relacional de propietarios, mascotas, citas y conversaciones.
- OpenAPI es la fuente única para generar hooks del cliente y validaciones del servidor.
- El proyecto conserva tres conversaciones iniciales de demostración y ya tiene el webhook de Twilio preparado para recibir mensajes reales.

## Product

- Dashboard de operación diaria.
- Agenda con búsqueda, creación y actualización de estado.
- Registro de pacientes y propietarios.
- Bandeja de conversaciones con respuestas automáticas y creación de citas desde el webhook de Twilio.
- Métricas de citas y reservas provenientes de WhatsApp.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- La ruta `/api/webhooks/twilio/whatsapp` es pública porque Twilio debe poder invocarla.
- El envío desde la bandeja requiere `TWILIO_ACCOUNT_SID` y `TWILIO_WHATSAPP_FROM`; no deben guardarse en el código.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details

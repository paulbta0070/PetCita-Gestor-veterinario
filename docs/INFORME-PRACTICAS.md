# PetCita — base para el documento de prácticas

## 1. Nombre del proyecto

**PetCita: gestor inteligente de citas veterinarias con agendamiento por WhatsApp.**

## 2. Descripción del problema

Muchas personas abandonan el proceso de reserva porque deben descargar una aplicación, crear una cuenta o completar formularios extensos. Al mismo tiempo, las clínicas veterinarias reciben solicitudes por WhatsApp y luego deben transcribirlas manualmente a una agenda, lo que puede generar cruces de horarios, pérdida de información y poca trazabilidad.

## 3. Propuesta de valor diferencial

PetCita permite agendar una cita veterinaria en una conversación de WhatsApp de aproximadamente dos pasos, sin obligar al cliente a crear una cuenta. La solicitud queda sincronizada con el panel de la clínica, donde el personal puede revisar el origen de la reserva, confirmar el horario y administrar la atención.

El MVP incluye tres conversaciones iniciales para demostrar el flujo en la bandeja sin depender de un número comercial. Además, el backend ya incorpora el webhook de Twilio y conserva la simulación como datos de demostración. Cuando se configura un remitente de WhatsApp Business, el mismo flujo puede recibir mensajes reales y crear citas.

## 4. Objetivo general

Desarrollar un sistema web para administrar citas, pacientes y conversaciones de una clínica veterinaria, incorporando un flujo de agendamiento conversacional por WhatsApp que reduzca el tiempo y la fricción de reserva para los clientes.

## 5. Objetivos específicos

1. Diseñar un panel para visualizar la operación diaria de la clínica.
2. Registrar y consultar mascotas y sus propietarios.
3. Crear, filtrar y actualizar el estado de las citas.
4. Registrar el origen de cada cita: panel interno o WhatsApp.
5. Simular y preparar una conversación automatizada para demostrar la reserva sin cuenta.
6. Persistir la información en una base de datos relacional.
7. Medir indicadores de uso y eficiencia del proceso de agendamiento.

## 6. Alcance del MVP

- Dashboard de operación diaria.
- Agenda de citas con búsqueda y estados.
- Registro de pacientes y propietarios.
- Bandeja de conversaciones de WhatsApp.
- Respuestas automáticas en español, con tres conversaciones iniciales de demostración.
- Persistencia en PostgreSQL.
- API REST con contratos OpenAPI.
- Datos iniciales para demostración académica.
- Webhook de entrada para Twilio en `/api/webhooks/twilio/whatsapp`.
- Creación automática de la cita cuando el cliente confirma el horario.

### Fuera del alcance inicial

- Pagos en línea.
- Historias clínicas completas.
- Inventario de medicamentos.
- Aplicación móvil nativa.
- Configuración del número comercial, remitente y URL pública dentro de Twilio.

## 7. Lenguajes y tecnologías

| Capa | Tecnología | Uso |
|---|---|---|
| Interfaz | TypeScript, React y Vite | Construcción del panel web |
| Estilos | CSS, Tailwind CSS y componentes React | Diseño adaptable y consistente |
| Backend | TypeScript y Node.js | Lógica de negocio y API |
| Servidor HTTP | Express 5 | Rutas REST y recepción de solicitudes |
| Base de datos | PostgreSQL | Persistencia relacional |
| ORM | Drizzle ORM | Consultas y definición del esquema |
| Validación | Zod | Validación de entradas y respuestas |
| Contrato | OpenAPI 3.1 | Definición única de la API y generación de tipos |
| Comunicación | Twilio mediante Replit Connectors | Recepción y envío de mensajes de WhatsApp |

### ¿En qué lenguaje está construido?

El proyecto está construido principalmente en **TypeScript**. TypeScript es un superset de JavaScript que agrega tipos estáticos y permite detectar errores antes de ejecutar la aplicación. La interfaz usa React con TypeScript y el backend también usa TypeScript sobre Node.js.

## 8. Arquitectura

PetCita utiliza una arquitectura web de tres capas:

1. **Cliente web:** la clínica usa el panel React desde el navegador.
2. **API REST:** Express recibe las solicitudes, valida los datos y aplica la lógica.
3. **Persistencia:** PostgreSQL almacena propietarios, mascotas, citas y conversaciones.

El contrato OpenAPI se encuentra en `lib/api-spec/openapi.yaml`. A partir de ese contrato se generan hooks de React Query para el cliente y esquemas Zod para validar el servidor. Esto evita que frontend y backend trabajen con estructuras diferentes.

## 9. Base de datos seleccionada

La base de datos utilizada es **PostgreSQL** porque:

- Es relacional y adecuada para citas con relaciones entre propietarios, mascotas y veterinarios.
- Permite usar restricciones como claves primarias, claves foráneas y valores únicos.
- Es robusta, libre y ampliamente usada en sistemas empresariales.
- Facilita consultas por fechas, estados y relaciones.
- Se integra con Drizzle ORM y permite mantener un esquema tipado.

### Modelo de datos

#### `pet_owners`

- `id`: identificador del propietario.
- `name`: nombre completo.
- `phone`: número de WhatsApp; es único.
- `created_at`: fecha de registro.

#### `pets`

- `id`: identificador de la mascota.
- `owner_id`: relación con el propietario.
- `name`: nombre.
- `species`: especie.
- `breed`: raza.
- `age`: edad.
- `last_visit`: fecha de la última visita.
- `avatar_color`: color visual para identificar el paciente.

#### `appointments`

- `id`: identificador de la cita.
- `pet_id`: relación con la mascota.
- `veterinarian`: profesional asignado.
- `service`: servicio solicitado.
- `appointment_date`: fecha de la cita.
- `appointment_time`: hora.
- `status`: `scheduled`, `confirmed`, `completed` o `cancelled`.
- `source`: `panel` o `whatsapp`.
- `notes`: observaciones.
- `created_at` y `updated_at`: auditoría básica.

#### `whatsapp_conversations`

- `id`: identificador de conversación.
- `owner_id`: propietario relacionado.
- `pet_id`: mascota relacionada.
- `status`: `active`, `booked` o `waiting`.
- `updated_at`: última actualización.

#### `whatsapp_messages`

- `id`: identificador del mensaje.
- `conversation_id`: conversación relacionada.
- `sender`: `client`, `bot` o `clinic`.
- `text`: contenido del mensaje.
- `created_at`: fecha y hora.

## 10. Módulos funcionales

### Dashboard

Muestra citas del día, confirmaciones pendientes, pacientes activos, reservas provenientes de WhatsApp, porcentaje de citas completadas y próxima atención.

### Agenda

Permite consultar las citas, buscar por mascota, propietario, servicio o veterinario, crear una nueva cita y cambiar el estado.

### Pacientes

Permite buscar mascotas, consultar sus datos y registrar un nuevo paciente junto con su propietario.

### WhatsApp

Muestra las tres conversaciones iniciales, mensajes enviados por el cliente, respuestas del bot y mensajes de la clínica. El flujo también acepta mensajes del webhook de Twilio y deja marcada la cita como proveniente de WhatsApp.

### Configuración

Muestra el estado del conector Twilio y si el envío desde la bandeja está configurado. La conexión requiere un `TWILIO_ACCOUNT_SID`, un `TWILIO_WHATSAPP_FROM` y un remitente de WhatsApp Business activo en Twilio. Estos valores se deben configurar como variables del entorno, nunca dentro del código.

## 11. Flujo principal del diferencial

1. El cliente escribe por WhatsApp: “Hola, quiero una cita para Max”.
2. El bot identifica la intención y consulta horarios disponibles.
3. El cliente responde con una opción, por ejemplo: “Sí, hoy a las 10:30”.
4. PetCita confirma la reserva.
5. La cita aparece en la agenda de la clínica con `source = whatsapp`.
6. El personal puede revisar, confirmar, completar o cancelar la cita.

## 12. Indicadores para evaluar el proyecto

### Indicadores de eficiencia

- **Tiempo promedio de agendamiento:** desde el primer mensaje hasta la confirmación.
- **Número promedio de interacciones:** cantidad de mensajes necesarios para reservar.
- **Porcentaje de reservas completadas:** reservas confirmadas / intentos de reserva × 100.
- **Porcentaje de abandono:** conversaciones que no llegan a una cita / conversaciones iniciadas × 100.

### Indicadores de operación

- **Citas provenientes de WhatsApp:** citas con `source = whatsapp`.
- **Citas confirmadas:** citas con `status = confirmed`.
- **Citas canceladas:** citas con `status = cancelled`.
- **Tiempo de respuesta de la clínica:** tiempo entre una solicitud pendiente y la respuesta del personal.

### Indicadores de experiencia

- Tiempo que tarda un usuario en reservar por WhatsApp frente al formulario tradicional.
- Número de pasos percibidos por el cliente.
- Nivel de satisfacción mediante una encuesta de 1 a 5.
- Porcentaje de usuarios que prefieren WhatsApp frente a crear una cuenta.

## 13. Plan de pruebas académicas

Se recomienda realizar una prueba con dos grupos:

- Grupo A: agenda una cita mediante un formulario web tradicional.
- Grupo B: agenda mediante el flujo conversacional de WhatsApp.

Registrar para cada persona:

1. Tiempo total.
2. Número de pasos.
3. Si completó o abandonó el proceso.
4. Errores encontrados.
5. Calificación de facilidad de uso de 1 a 5.

La hipótesis es que el grupo de WhatsApp tendrá menor tiempo promedio, menos abandono y mayor percepción de facilidad.

## 14. Trabajo futuro

1. Configurar y verificar el remitente de WhatsApp Business en Twilio.
2. Publicar PetCita y registrar su URL HTTPS como webhook de mensajes entrantes.
3. Completar la validación de firma de Twilio en el webhook.
4. Consultar disponibilidad real por veterinario y servicio.
5. Enviar recordatorios y mensajes de reprogramación.
6. Agregar autenticación y roles para administrador, veterinario y recepción.
7. Añadir historia clínica, vacunas y archivos del paciente.

## 15. Conclusión

PetCita aporta valor porque conecta el canal de comunicación que el cliente ya usa con la herramienta operativa de la clínica. La solución evita crear una cuenta para la reserva, reduce la digitación manual y deja trazabilidad sobre el origen de cada cita. La arquitectura utilizada permite comenzar con una demostración controlada y evolucionar hacia una integración real con WhatsApp Business.
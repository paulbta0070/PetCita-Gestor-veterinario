import { Router, type IRouter } from "express";
import {
  CreateAppointmentBody,
  CreatePetBody,
  ListAppointmentsQueryParams,
  ListPetsQueryParams,
  SendWhatsappMessageBody,
  SendWhatsappMessageParams,
  UpdateAppointmentBody,
  UpdateAppointmentParams,
} from "@workspace/api-zod";
import { db } from "@workspace/db";
import {
  appointmentsTable,
  petOwnersTable,
  petsTable,
  whatsappConversationsTable,
  whatsappMessagesTable,
} from "@workspace/db";
import { and, asc, desc, eq, ilike, or } from "drizzle-orm";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const isoDate = (value: Date | string | null | undefined) => {
  if (!value) return null;
  if (typeof value === "string") return value;
  return value.toISOString().slice(0, 10);
};

const timeLabel = (value: Date) =>
  value.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", hour12: false });

async function getAppointment(id: number) {
  const rows = await db
    .select({
      id: appointmentsTable.id,
      petId: appointmentsTable.petId,
      petName: petsTable.name,
      species: petsTable.species,
      ownerName: petOwnersTable.name,
      ownerPhone: petOwnersTable.phone,
      veterinarian: appointmentsTable.veterinarian,
      service: appointmentsTable.service,
      appointmentDate: appointmentsTable.appointmentDate,
      appointmentTime: appointmentsTable.appointmentTime,
      status: appointmentsTable.status,
      source: appointmentsTable.source,
      notes: appointmentsTable.notes,
    })
    .from(appointmentsTable)
    .innerJoin(petsTable, eq(appointmentsTable.petId, petsTable.id))
    .innerJoin(petOwnersTable, eq(petsTable.ownerId, petOwnersTable.id))
    .where(eq(appointmentsTable.id, id))
    .limit(1);
  return rows[0] ?? null;
}

async function getConversation(id: number) {
  const [conversation] = await db
    .select({
      id: whatsappConversationsTable.id,
      clientName: petOwnersTable.name,
      phone: petOwnersTable.phone,
      petName: petsTable.name,
      petSpecies: petsTable.species,
      status: whatsappConversationsTable.status,
      updatedAt: whatsappConversationsTable.updatedAt,
    })
    .from(whatsappConversationsTable)
    .innerJoin(petOwnersTable, eq(whatsappConversationsTable.ownerId, petOwnersTable.id))
    .innerJoin(petsTable, eq(whatsappConversationsTable.petId, petsTable.id))
    .where(eq(whatsappConversationsTable.id, id))
    .limit(1);

  if (!conversation) return null;
  const messages = await db
    .select({
      id: whatsappMessagesTable.id,
      sender: whatsappMessagesTable.sender,
      text: whatsappMessagesTable.text,
      createdAt: whatsappMessagesTable.createdAt,
    })
    .from(whatsappMessagesTable)
    .where(eq(whatsappMessagesTable.conversationId, id))
    .orderBy(asc(whatsappMessagesTable.createdAt));
  const last = messages[messages.length - 1];

  return {
    id: conversation.id,
    clientName: conversation.clientName,
    phone: conversation.phone,
    petName: conversation.petName,
    petSpecies: conversation.petSpecies,
    status: conversation.status,
    lastMessage: last?.text ?? "",
    lastMessageTime: last ? timeLabel(last.createdAt) : timeLabel(conversation.updatedAt),
    messages: messages.map((message) => ({
      id: message.id,
      sender: message.sender,
      text: message.text,
      time: timeLabel(message.createdAt),
    })),
  };
}

router.get("/dashboard/summary", async (_req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const appointments = await db.select().from(appointmentsTable);
  const pets = await db.select().from(petsTable);
  const todayAppointments = appointments.filter((item) => item.appointmentDate === today);
  const pendingConfirmation = appointments.filter((item) => item.status === "scheduled").length;
  const completed = appointments.filter((item) => item.status === "completed").length;
  const activePatients = pets.length;
  const whatsappBookings = appointments.filter((item) => item.source === "whatsapp").length;
  const next = todayAppointments.find((item) => item.appointmentTime >= new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", hour12: false })) ?? todayAppointments[0];
  const nextAppointment = next ? await getAppointment(next.id) : null;
  const weeklyAppointments = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(`${today}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + index - 3);
    const value = date.toISOString().slice(0, 10);
    return {
      day: date.toLocaleDateString("es-CO", { weekday: "short" }).replace(".", ""),
      count: appointments.filter((item) => item.appointmentDate === value).length,
    };
  });

  res.json({
    todayAppointments: todayAppointments.length,
    pendingConfirmation,
    activePatients,
    whatsappBookings,
    completionRate: appointments.length ? Math.round((completed / appointments.length) * 100) : 0,
    nextAppointment,
    weeklyAppointments,
  });
});

router.get("/appointments", async (req, res) => {
  const query = ListAppointmentsQueryParams.parse({
    date: req.query.date ? new Date(String(req.query.date)) : undefined,
    status: req.query.status,
    search: req.query.search,
  });
  const rows = await db
    .select({
      id: appointmentsTable.id,
      petId: appointmentsTable.petId,
      petName: petsTable.name,
      species: petsTable.species,
      ownerName: petOwnersTable.name,
      ownerPhone: petOwnersTable.phone,
      veterinarian: appointmentsTable.veterinarian,
      service: appointmentsTable.service,
      appointmentDate: appointmentsTable.appointmentDate,
      appointmentTime: appointmentsTable.appointmentTime,
      status: appointmentsTable.status,
      source: appointmentsTable.source,
      notes: appointmentsTable.notes,
    })
    .from(appointmentsTable)
    .innerJoin(petsTable, eq(appointmentsTable.petId, petsTable.id))
    .innerJoin(petOwnersTable, eq(petsTable.ownerId, petOwnersTable.id))
    .orderBy(asc(appointmentsTable.appointmentDate), asc(appointmentsTable.appointmentTime));

  const date = query.date ? isoDate(query.date) : undefined;
  const filtered = rows.filter((item) => {
    const search = query.search?.toLowerCase();
    return (!date || item.appointmentDate === date)
      && (!query.status || item.status === query.status)
      && (!search || [item.petName, item.ownerName, item.service, item.veterinarian].some((value) => value.toLowerCase().includes(search)));
  });
  res.json(filtered);
});

router.post("/appointments", async (req, res) => {
  const body = CreateAppointmentBody.parse(req.body);
  const created = await db.insert(appointmentsTable).values({
    ...body,
    appointmentDate: isoDate(body.appointmentDate)!,
    status: "scheduled",
    notes: body.notes ?? null,
  }).returning({ id: appointmentsTable.id });
  const appointment = await getAppointment(created[0].id);
  res.status(201).json(appointment);
});

router.patch("/appointments/:id", async (req, res) => {
  const params = UpdateAppointmentParams.parse(req.params);
  const body = UpdateAppointmentBody.parse(req.body);
  const updated = await db.update(appointmentsTable).set({
    ...body,
    appointmentDate: body.appointmentDate ? isoDate(body.appointmentDate)! : undefined,
    notes: body.notes,
    updatedAt: new Date(),
  }).where(eq(appointmentsTable.id, params.id)).returning({ id: appointmentsTable.id });
  if (!updated[0]) {
    res.status(404).json({ error: "Cita no encontrada" });
    return;
  }
  res.json(await getAppointment(updated[0].id));
});

router.get("/pets", async (req, res) => {
  const query = ListPetsQueryParams.parse({ search: req.query.search });
  const rows = await db
    .select({
      id: petsTable.id,
      name: petsTable.name,
      species: petsTable.species,
      breed: petsTable.breed,
      age: petsTable.age,
      ownerName: petOwnersTable.name,
      ownerPhone: petOwnersTable.phone,
      lastVisit: petsTable.lastVisit,
      avatarColor: petsTable.avatarColor,
    })
    .from(petsTable)
    .innerJoin(petOwnersTable, eq(petsTable.ownerId, petOwnersTable.id))
    .orderBy(asc(petsTable.name));
  const appointments = await db.select().from(appointmentsTable);
  const search = query.search?.toLowerCase();
  res.json(rows.filter((pet) => {
    const next = appointments
      .filter((appointment) => appointment.petId === pet.id && appointment.status !== "cancelled")
      .sort((a, b) => `${a.appointmentDate}${a.appointmentTime}`.localeCompare(`${b.appointmentDate}${b.appointmentTime}`))[0];
    return (!search || [pet.name, pet.ownerName, pet.species, pet.breed].some((value) => value.toLowerCase().includes(search)));
  }).map((pet) => ({
    ...pet,
    nextAppointment: appointments
      .filter((appointment) => appointment.petId === pet.id && appointment.status !== "cancelled")
      .sort((a, b) => `${a.appointmentDate}${a.appointmentTime}`.localeCompare(`${b.appointmentDate}${b.appointmentTime}`))[0]?.appointmentDate ?? null,
  })));
});

router.post("/pets", async (req, res) => {
  const body = CreatePetBody.parse(req.body);
  const owner = await db.insert(petOwnersTable).values({
    name: body.ownerName,
    phone: body.ownerPhone,
  }).onConflictDoUpdate({
    target: petOwnersTable.phone,
    set: { name: body.ownerName },
  }).returning({ id: petOwnersTable.id });
  const pet = await db.insert(petsTable).values({
    ownerId: owner[0].id,
    name: body.name,
    species: body.species,
    breed: body.breed,
    age: body.age,
    lastVisit: null,
    avatarColor: "#D9F4EC",
  }).returning({ id: petsTable.id });
  const rows = await db
    .select({
      id: petsTable.id,
      name: petsTable.name,
      species: petsTable.species,
      breed: petsTable.breed,
      age: petsTable.age,
      ownerName: petOwnersTable.name,
      ownerPhone: petOwnersTable.phone,
      lastVisit: petsTable.lastVisit,
      avatarColor: petsTable.avatarColor,
    })
    .from(petsTable)
    .innerJoin(petOwnersTable, eq(petsTable.ownerId, petOwnersTable.id))
    .where(eq(petsTable.id, pet[0].id));
  res.status(201).json({ ...rows[0], nextAppointment: null });
});

router.get("/whatsapp/conversations", async (_req, res) => {
  const conversations = await db.select({ id: whatsappConversationsTable.id }).from(whatsappConversationsTable).orderBy(desc(whatsappConversationsTable.updatedAt));
  const result = await Promise.all(conversations.map((conversation) => getConversation(conversation.id)));
  res.json(result.filter(Boolean));
});

router.post("/whatsapp/conversations/:id/messages", async (req, res) => {
  const params = SendWhatsappMessageParams.parse(req.params);
  const body = SendWhatsappMessageBody.parse(req.body);
  const conversation = await getConversation(params.id);
  if (!conversation) {
    res.status(404).json({ error: "Conversación no encontrada" });
    return;
  }
  await db.insert(whatsappMessagesTable).values({
    conversationId: params.id,
    sender: "clinic",
    text: body.text,
  });
  const lower = body.text.toLowerCase();
  const reply = lower.includes("hola")
    ? `Hola ${conversation.clientName.split(" ")[0]}. ¿En qué podemos ayudarte con ${conversation.petName}?`
    : lower.includes("cita") || lower.includes("agendar")
      ? `Para ${conversation.petName} tenemos disponibilidad hoy a las 3:30 p. m. o mañana a las 8:30 a. m. Responde con el horario que prefieras.`
      : lower.includes("3:30") || lower.includes("15:30") || lower.includes("confirm")
        ? "Listo, tu cita quedó confirmada. Te enviaremos un recordatorio antes de la consulta."
        : "Gracias por escribirnos. Un miembro de la clínica revisará tu solicitud y te responderá en unos minutos.";
  await db.insert(whatsappMessagesTable).values({
    conversationId: params.id,
    sender: "bot",
    text: reply,
  });
  await db.update(whatsappConversationsTable).set({
    status: lower.includes("confirm") ? "booked" : "active",
    updatedAt: new Date(),
  }).where(eq(whatsappConversationsTable.id, params.id));
  res.json(await getConversation(params.id));
});

router.use((error: unknown, _req: unknown, res: { status: (code: number) => typeof res; json: (value: unknown) => void }, _next: unknown) => {
  logger.error({ error }, "PetCita request failed");
  res.status(400).json({ error: error instanceof Error ? error.message : "Solicitud inválida" });
});

export default router;
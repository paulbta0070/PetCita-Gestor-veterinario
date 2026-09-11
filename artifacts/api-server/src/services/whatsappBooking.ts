import { and, asc, eq } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  appointmentsTable,
  petOwnersTable,
  petsTable,
  whatsappConversationsTable,
  whatsappMessagesTable,
} from "@workspace/db";

type IncomingWhatsapp = {
  phone: string;
  text: string;
};

const today = () => new Date().toISOString().slice(0, 10);
const tomorrow = () => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
};

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || "allí";
}

function hasConfirmation(text: string) {
  return /\b(si|sí|confirmo|confirmar|listo|dale|ok)\b/i.test(text);
}

function requestedTime(text: string) {
  const match = text.match(/\b([01]?\d|2[0-3])(?::([0-5]\d))?\s*(a\.?\s*m\.?|p\.?\s*m\.?)?\b/i);
  if (!match) return null;
  let hour = Number(match[1]);
  const minutes = match[2] ?? "00";
  const meridiem = match[3]?.replace(/\s/g, "").toLowerCase();
  if (meridiem?.startsWith("p") && hour < 12) hour += 12;
  if (meridiem?.startsWith("a") && hour === 12) hour = 0;
  return `${String(hour).padStart(2, "0")}:${minutes}`;
}

async function findOrCreateClient(phone: string) {
  const normalizedPhone = phone.replace(/^whatsapp:/, "");
  const [existingOwner] = await db
    .select()
    .from(petOwnersTable)
    .where(eq(petOwnersTable.phone, normalizedPhone))
    .limit(1);

  if (existingOwner) {
    const [existingPet] = await db
      .select()
      .from(petsTable)
      .where(eq(petsTable.ownerId, existingOwner.id))
      .orderBy(asc(petsTable.id))
      .limit(1);
    if (existingPet) return { owner: existingOwner, pet: existingPet };
  }

  const owner = existingOwner
    ?? (await db.insert(petOwnersTable).values({
      name: "Cliente de WhatsApp",
      phone: normalizedPhone,
    }).returning())[0];
  const pet = (await db.insert(petsTable).values({
    ownerId: owner.id,
    name: "Mascota de WhatsApp",
    species: "Perro",
    breed: "Por confirmar",
    age: 0,
    lastVisit: null,
    avatarColor: "#D9F4EC",
  }).returning())[0];
  return { owner, pet };
}

async function getOrCreateConversation(phone: string) {
  const normalizedPhone = phone.replace(/^whatsapp:/, "");
  const client = await findOrCreateClient(normalizedPhone);
  const [conversation] = await db
    .select()
    .from(whatsappConversationsTable)
    .where(and(
      eq(whatsappConversationsTable.ownerId, client.owner.id),
      eq(whatsappConversationsTable.petId, client.pet.id),
    ))
    .limit(1);
  if (conversation) return { conversation, ...client };

  const created = (await db.insert(whatsappConversationsTable).values({
    ownerId: client.owner.id,
    petId: client.pet.id,
    status: "active",
  }).returning())[0];
  return { conversation: created, ...client };
}

async function bookAppointment(
  ownerId: number,
  petId: number,
  text: string,
) {
  const appointmentTime = requestedTime(text) ?? "15:30";
  const appointmentDate = /ma[ñn]ana/i.test(text) ? tomorrow() : today();
  const existing = await db
    .select()
    .from(appointmentsTable)
    .where(and(
      eq(appointmentsTable.petId, petId),
      eq(appointmentsTable.appointmentDate, appointmentDate),
      eq(appointmentsTable.appointmentTime, appointmentTime),
    ))
    .limit(1);
  if (existing[0]) return existing[0];

  return (await db.insert(appointmentsTable).values({
    petId,
    veterinarian: "Dra. Valentina Ruiz",
    service: "Consulta general",
    appointmentDate,
    appointmentTime,
    status: "confirmed",
    source: "whatsapp",
    notes: `Reserva recibida por WhatsApp para ${ownerId}.`,
  }).returning())[0];
}

export async function processIncomingWhatsapp({ phone, text }: IncomingWhatsapp) {
  const { conversation, owner, pet } = await getOrCreateConversation(phone);
  const cleanedText = text.trim() || "Mensaje sin texto";
  await db.insert(whatsappMessagesTable).values({
    conversationId: conversation.id,
    sender: "client",
    text: cleanedText,
  });

  const lower = cleanedText.toLowerCase();
  const wantsBooking = lower.includes("cita")
    || lower.includes("agendar")
    || lower.includes("reservar")
    || lower.includes("consulta");
  const shouldBook = hasConfirmation(cleanedText)
    || Boolean(requestedTime(cleanedText) && conversation.status === "waiting");

  let reply: string;
  let status = conversation.status;
  if (shouldBook) {
    const appointment = await bookAppointment(owner.id, pet.id, cleanedText);
    reply = `Listo, ${firstName(owner.name)}. La cita de ${pet.name} quedó confirmada para el ${appointment.appointmentDate} a las ${appointment.appointmentTime}. Te esperamos en Clínica Vecina.`;
    status = "booked";
  } else if (wantsBooking) {
    reply = `Claro, ${firstName(owner.name)}. Para ${pet.name} tengo hoy a las 15:30 o mañana a las 08:30. Responde con “sí” y el horario que prefieras.`;
    status = "waiting";
  } else {
    reply = `Hola, ${firstName(owner.name)}. Soy el asistente de Clínica Vecina. Puedo ayudarte a agendar una cita para ${pet.name}.`;
    status = "active";
  }

  await db.insert(whatsappMessagesTable).values({
    conversationId: conversation.id,
    sender: "bot",
    text: reply,
  });
  await db.update(whatsappConversationsTable).set({
    status,
    updatedAt: new Date(),
  }).where(eq(whatsappConversationsTable.id, conversation.id));

  return { reply, conversationId: conversation.id, status };
}
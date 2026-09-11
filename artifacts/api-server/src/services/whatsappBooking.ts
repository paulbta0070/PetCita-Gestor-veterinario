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
  if (!name || name === "Cliente") return "allí";
  return name.trim().split(/\s+/)[0];
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
      name: "Cliente",
      phone: normalizedPhone,
    }).returning())[0];

  const pet = (await db.insert(petsTable).values({
    ownerId: owner.id,
    name: "tu mascota",
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
  slotOption: string
) {
  let appointmentDate = today();
  let appointmentTime = "15:30";

  if (slotOption === "2") {
    appointmentDate = tomorrow();
    appointmentTime = "08:30";
  } else if (slotOption === "3") {
    appointmentDate = tomorrow();
    appointmentTime = "11:00";
  }

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
    notes: `Reserva recibida por menú de WhatsApp (Opción ${slotOption}).`,
  }).returning())[0];
}

export async function processIncomingWhatsapp({ phone, text }: IncomingWhatsapp) {
  const { conversation, owner, pet } = await getOrCreateConversation(phone);
  const cleanedText = text.trim() || "Mensaje sin texto";

  // Registrar mensaje del usuario
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

  let reply: string;
  let nextStatus = conversation.status;

  switch (conversation.status) {
    case "waiting":
      // Validar si el cliente seleccionó una opción válida del menú (1, 2 o 3)
      if (["1", "2", "3"].includes(cleanedText)) {
        const appointment = await bookAppointment(owner.id, pet.id, cleanedText);
        const ownerDisplayName = firstName(owner.name);
        const petDisplayName = pet.name === "tu mascota" ? "tu mascota" : pet.name;

        reply = `¡Excelente, ${ownerDisplayName}! La cita para ${petDisplayName} ha sido agendada con éxito para el día ${appointment.appointmentDate} a las ${appointment.appointmentTime}. Te esperamos en Clínica Vecina 🐾.`;
        nextStatus = "booked";
      } else {
        reply = `Por favor responde únicamente con el número de la opción que prefieras:\n\n1️⃣ Hoy - 15:30\n2️⃣ Mañana - 08:30\n3️⃣ Mañana - 11:00`;
      }
      break;

    case "booked":
      if (/\b(gracias|grax|ok|vale|listo|perfecto|chao|adios)\b/i.test(lower)) {
        reply = `¡Con mucho gusto! Estamos para servirte. Nos vemos pronto en Clínica Vecina 🐾.`;
        nextStatus = "booked";
      } else if (wantsBooking) {
        reply = `Ya tienes una cita confirmada. Para agendar una cita adicional, selecciona una opción respondiendo con el número:\n\n1️⃣ Hoy - 15:30\n2️⃣ Mañana - 08:30\n3️⃣ Mañana - 11:00`;
        nextStatus = "waiting";
      } else {
        reply = `Tu cita ya se encuentra registrada. Si necesitas consultar otro servicio o cambiarla, escribe la palabra "Cita".`;
      }
      break;

    case "active":
    default:
      if (wantsBooking) {
        const ownerDisplayName = firstName(owner.name);
        const petDisplayName = pet.name === "tu mascota" ? "tu mascota" : pet.name;

        reply = `¡Hola, ${ownerDisplayName}! Con gusto te ayudo a agendar la consulta de ${petDisplayName} 🐾.\n\nPor favor responde con el NÚMERO del horario que prefieras:\n\n1️⃣ Hoy - 15:30\n2️⃣ Mañana - 08:30\n3️⃣ Mañana - 11:00`;
        nextStatus = "waiting";
      } else {
        reply = `Hola. Soy el asistente de Clínica Vecina 🐾. Escribe la palabra "Cita" o "Agendar" para mostrarte los horarios disponibles.`;
        nextStatus = "active";
      }
      break;
  }

  // Registrar mensaje del bot
  await db.insert(whatsappMessagesTable).values({
    conversationId: conversation.id,
    sender: "bot",
    text: reply,
  });

  // Actualizar estado en PostgreSQL
  await db.update(whatsappConversationsTable)
    .set({
      status: nextStatus,
      updatedAt: new Date(),
    })
    .where(eq(whatsappConversationsTable.id, conversation.id));

  return { reply, conversationId: conversation.id, status: nextStatus };
}
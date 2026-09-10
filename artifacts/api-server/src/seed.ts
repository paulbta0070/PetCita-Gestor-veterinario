import { db } from "@workspace/db";
import {
  appointmentsTable,
  petOwnersTable,
  petsTable,
  whatsappConversationsTable,
  whatsappMessagesTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";

const today = new Date().toISOString().slice(0, 10);
const addDays = (days: number) => {
  const date = new Date(`${today}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

export async function seedDatabase() {
  const existing = await db.select({ id: petOwnersTable.id }).from(petOwnersTable).limit(1);
  if (existing.length > 0) return;

  const [ana, camilo, maria, julian] = await db
    .insert(petOwnersTable)
    .values([
      { name: "Ana Torres", phone: "+57 310 555 0182" },
      { name: "Camilo Rojas", phone: "+57 315 555 0227" },
      { name: "María Fernanda López", phone: "+57 301 555 0431" },
      { name: "Julián Gómez", phone: "+57 320 555 0674" },
    ])
    .returning();

  const [luna, max, simon, nala, coco] = await db
    .insert(petsTable)
    .values([
      { ownerId: ana.id, name: "Luna", species: "Perro", breed: "Golden retriever", age: 4, lastVisit: addDays(-32), avatarColor: "#FCE7B2" },
      { ownerId: camilo.id, name: "Max", species: "Perro", breed: "Bulldog francés", age: 2, lastVisit: addDays(-14), avatarColor: "#D9F4EC" },
      { ownerId: maria.id, name: "Simón", species: "Gato", breed: "Criollo", age: 6, lastVisit: addDays(-48), avatarColor: "#E9DFFC" },
      { ownerId: julian.id, name: "Nala", species: "Gato", breed: "Siamés", age: 3, lastVisit: addDays(-21), avatarColor: "#FBD8D8" },
      { ownerId: ana.id, name: "Coco", species: "Perro", breed: "Cocker spaniel", age: 7, lastVisit: addDays(-9), avatarColor: "#DCEBFF" },
    ])
    .returning();

  const appointments = await db
    .insert(appointmentsTable)
    .values([
      { petId: luna.id, veterinarian: "Dra. Valentina Ruiz", service: "Consulta general", appointmentDate: today, appointmentTime: "09:00", status: "confirmed", source: "panel", notes: "Control anual y vacunas." },
      { petId: max.id, veterinarian: "Dr. Andrés Molina", service: "Vacunación", appointmentDate: today, appointmentTime: "10:30", status: "scheduled", source: "whatsapp", notes: "Primera dosis de refuerzo." },
      { petId: simon.id, veterinarian: "Dra. Valentina Ruiz", service: "Consulta general", appointmentDate: today, appointmentTime: "12:00", status: "confirmed", source: "panel", notes: null },
      { petId: nala.id, veterinarian: "Dr. Andrés Molina", service: "Dermatología", appointmentDate: today, appointmentTime: "15:30", status: "scheduled", source: "whatsapp", notes: "La familia reporta irritación en la piel." },
      { petId: coco.id, veterinarian: "Dra. Valentina Ruiz", service: "Control preventivo", appointmentDate: addDays(1), appointmentTime: "08:30", status: "scheduled", source: "panel", notes: null },
      { petId: max.id, veterinarian: "Dra. Valentina Ruiz", service: "Desparasitación", appointmentDate: addDays(2), appointmentTime: "11:00", status: "scheduled", source: "whatsapp", notes: null },
    ])
    .returning();

  const [conversationOne, conversationTwo, conversationThree] = await db
    .insert(whatsappConversationsTable)
    .values([
      { ownerId: camilo.id, petId: max.id, status: "booked" },
      { ownerId: ana.id, petId: luna.id, status: "active" },
      { ownerId: julian.id, petId: nala.id, status: "waiting" },
    ])
    .returning();

  await db.insert(whatsappMessagesTable).values([
    { conversationId: conversationOne.id, sender: "client", text: "Hola, quiero una cita para Max.", createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000) },
    { conversationId: conversationOne.id, sender: "bot", text: "Claro. Tengo disponibilidad hoy a las 10:30 con el Dr. Andrés. ¿La confirmamos?", createdAt: new Date(Date.now() - 47 * 60 * 60 * 1000) },
    { conversationId: conversationOne.id, sender: "client", text: "Sí, por favor.", createdAt: new Date(Date.now() - 46 * 60 * 60 * 1000) },
    { conversationId: conversationTwo.id, sender: "client", text: "Buenos días, ¿puedo agendar control para Luna?", createdAt: new Date(Date.now() - 35 * 60 * 1000) },
    { conversationId: conversationTwo.id, sender: "bot", text: "¡Hola, Ana! Para Luna tengo hoy a las 9:00 o mañana a las 8:30. Responde con tu horario preferido.", createdAt: new Date(Date.now() - 32 * 60 * 1000) },
    { conversationId: conversationThree.id, sender: "client", text: "Nala necesita una cita, tiene una irritación.", createdAt: new Date(Date.now() - 12 * 60 * 1000) },
    { conversationId: conversationThree.id, sender: "bot", text: "Entiendo. Puedo reservar una consulta de dermatología hoy a las 15:30. ¿Te funciona ese horario?", createdAt: new Date(Date.now() - 10 * 60 * 1000) },
  ]);

  await db
    .update(appointmentsTable)
    .set({ source: "whatsapp" })
    .where(eq(appointmentsTable.id, appointments[1].id));
}
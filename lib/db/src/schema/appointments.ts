import { createInsertSchema } from "drizzle-zod";
import { date, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { petsTable } from "./pets";

export const appointmentsTable = pgTable("appointments", {
  id: serial("id").primaryKey(),
  petId: integer("pet_id").notNull().references(() => petsTable.id),
  veterinarian: text("veterinarian").notNull(),
  service: text("service").notNull(),
  appointmentDate: date("appointment_date", { mode: "string" }).notNull(),
  appointmentTime: text("appointment_time").notNull(),
  status: text("status").notNull().default("scheduled"),
  source: text("source").notNull().default("panel"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertAppointmentSchema = createInsertSchema(appointmentsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type Appointment = typeof appointmentsTable.$inferSelect;
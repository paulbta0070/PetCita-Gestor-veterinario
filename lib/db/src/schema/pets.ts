import { createInsertSchema } from "drizzle-zod";
import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const petOwnersTable = pgTable("pet_owners", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const petsTable = pgTable("pets", {
  id: serial("id").primaryKey(),
  ownerId: integer("owner_id").notNull().references(() => petOwnersTable.id),
  name: text("name").notNull(),
  species: text("species").notNull(),
  breed: text("breed").notNull(),
  age: integer("age").notNull().default(0),
  lastVisit: text("last_visit"),
  avatarColor: text("avatar_color").notNull().default("#D9F4EC"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPetOwnerSchema = createInsertSchema(petOwnersTable).omit({
  id: true,
  createdAt: true,
});
export const insertPetSchema = createInsertSchema(petsTable).omit({
  id: true,
  createdAt: true,
});

export type InsertPetOwner = z.infer<typeof insertPetOwnerSchema>;
export type InsertPet = z.infer<typeof insertPetSchema>;
export type PetOwner = typeof petOwnersTable.$inferSelect;
export type Pet = typeof petsTable.$inferSelect;
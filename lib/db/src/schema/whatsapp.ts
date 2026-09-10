import { createInsertSchema } from "drizzle-zod";
import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { petOwnersTable, petsTable } from "./pets";

export const whatsappConversationsTable = pgTable("whatsapp_conversations", {
  id: serial("id").primaryKey(),
  ownerId: integer("owner_id").notNull().references(() => petOwnersTable.id),
  petId: integer("pet_id").notNull().references(() => petsTable.id),
  status: text("status").notNull().default("active"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const whatsappMessagesTable = pgTable("whatsapp_messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => whatsappConversationsTable.id),
  sender: text("sender").notNull(),
  text: text("text").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertWhatsappConversationSchema = createInsertSchema(whatsappConversationsTable).omit({
  id: true,
  updatedAt: true,
});
export const insertWhatsappMessageSchema = createInsertSchema(whatsappMessagesTable).omit({
  id: true,
  createdAt: true,
});

export type InsertWhatsappConversation = z.infer<typeof insertWhatsappConversationSchema>;
export type InsertWhatsappMessage = z.infer<typeof insertWhatsappMessageSchema>;
export type WhatsappConversation = typeof whatsappConversationsTable.$inferSelect;
export type WhatsappMessage = typeof whatsappMessagesTable.$inferSelect;
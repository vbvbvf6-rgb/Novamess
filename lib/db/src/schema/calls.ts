import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { chatsTable } from "./chats";

export const callsTable = pgTable("calls", {
  id: serial("id").primaryKey(),
  chatId: integer("chat_id").references(() => chatsTable.id),
  callerId: integer("caller_id").notNull().references(() => usersTable.id),
  calleeId: integer("callee_id").references(() => usersTable.id),
  type: text("type").notNull().default("audio"),
  status: text("status").notNull().default("ringing"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  durationSeconds: integer("duration_seconds"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCallSchema = createInsertSchema(callsTable).omit({ id: true, createdAt: true });
export type InsertCall = z.infer<typeof insertCallSchema>;
export type Call = typeof callsTable.$inferSelect;

export const audioRoomsTable = pgTable("audio_rooms", {
  id: serial("id").primaryKey(),
  callId: integer("call_id").notNull().references(() => callsTable.id, { onDelete: "cascade" }),
  hostId: integer("host_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull().default("Аудиокомната"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

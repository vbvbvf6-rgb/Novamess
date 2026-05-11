import { pgTable, text, serial, integer, timestamp, boolean, jsonb, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { chatsTable } from "./chats";
import { usersTable } from "./users";

export const messagesTable = pgTable("messages", {
  id: serial("id").primaryKey(),
  chatId: integer("chat_id").notNull().references(() => chatsTable.id),
  senderId: integer("sender_id").notNull().references(() => usersTable.id),
  text: text("text"),
  type: text("type").notNull().default("text"),
  mediaUrl: text("media_url"),
  replyToId: integer("reply_to_id"),
  isEdited: boolean("is_edited").notNull().default(false),
  isDeleted: boolean("is_deleted").notNull().default(false),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const reactionsTable = pgTable("reactions", {
  id: serial("id").primaryKey(),
  messageId: integer("message_id").notNull().references(() => messagesTable.id),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  emoji: text("emoji").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const scheduledMessagesTable = pgTable("scheduled_messages", {
  id: serial("id").primaryKey(),
  chatId: integer("chat_id").notNull(),
  senderId: integer("sender_id").notNull(),
  text: text("text").notNull(),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const pollsTable = pgTable("polls", {
  id: serial("id").primaryKey(),
  messageId: integer("message_id").notNull().references(() => messagesTable.id),
  chatId: integer("chat_id").notNull(),
  createdBy: integer("created_by").notNull().references(() => usersTable.id),
  question: text("question").notNull(),
  options: jsonb("options").notNull().$type<string[]>(),
  allowMultiple: boolean("allow_multiple").notNull().default(false),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const pollVotesTable = pgTable("poll_votes", {
  id: serial("id").primaryKey(),
  pollId: integer("poll_id").notNull().references(() => pollsTable.id),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  optionIndex: integer("option_index").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [unique().on(t.pollId, t.userId, t.optionIndex)]);

export const insertMessageSchema = createInsertSchema(messagesTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertReactionSchema = createInsertSchema(reactionsTable).omit({ id: true, createdAt: true });
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messagesTable.$inferSelect;
export type InsertReaction = z.infer<typeof insertReactionSchema>;
export type Reaction = typeof reactionsTable.$inferSelect;
export type ScheduledMessage = typeof scheduledMessagesTable.$inferSelect;
export type Poll = typeof pollsTable.$inferSelect;
export type PollVote = typeof pollVotesTable.$inferSelect;

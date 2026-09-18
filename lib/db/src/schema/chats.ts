import { pgTable, text, serial, integer, timestamp, boolean, unique, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const chatsTable = pgTable("chats", {
  id: serial("id").primaryKey(),
  type: text("type").notNull().default("direct"),
  name: text("name"),
  description: text("description"),
  avatarUrl: text("avatar_url"),
  avatarColor: text("avatar_color").notNull().default("#3B82F6"),
  autoDeleteTimer: integer("auto_delete_timer"),
  pinnedMessageId: integer("pinned_message_id"),
  slowMode: integer("slow_mode").default(0),
  whoCanSend: text("who_can_send").default("all"),
  isPublic: boolean("is_public").default(false),
  inviteToken: text("invite_token"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const chatMembersTable = pgTable("chat_members", {
  id: serial("id").primaryKey(),
  chatId: integer("chat_id").notNull().references(() => chatsTable.id),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  role: text("role").notNull().default("member"),
  isPinned: boolean("is_pinned").notNull().default(false),
  isMuted: boolean("is_muted").notNull().default(false),
  isArchived: boolean("is_archived").notNull().default(false),
  lastReadAt: timestamp("last_read_at", { withTimezone: true }),
  lastDeliveredAt: timestamp("last_delivered_at", { withTimezone: true }),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique("chat_members_chat_user_unique").on(t.chatId, t.userId),
  index("idx_chat_members_user_id").on(t.userId),
]);

export const chatFoldersTable = pgTable("chat_folders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  name: text("name").notNull(),
  icon: text("icon").notNull().default("📁"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const chatFolderChatsTable = pgTable("chat_folder_chats", {
  id: serial("id").primaryKey(),
  folderId: integer("folder_id").notNull(),
  chatId: integer("chat_id").notNull().references(() => chatsTable.id),
}, (t) => [unique("folder_chat_unique").on(t.folderId, t.chatId)]);

export const insertChatSchema = createInsertSchema(chatsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertChatMemberSchema = createInsertSchema(chatMembersTable).omit({ id: true, joinedAt: true });
export type InsertChat = z.infer<typeof insertChatSchema>;
export type Chat = typeof chatsTable.$inferSelect;
export type InsertChatMember = z.infer<typeof insertChatMemberSchema>;
export type ChatMember = typeof chatMembersTable.$inferSelect;

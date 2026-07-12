import { pgTable, serial, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

// Catalog of purchasable/sendable gift types. Table predates the current
// schema-driven migration flow, so columns are kept in exact sync with the
// original hand-written SQL (see lib/db/drizzle/0000_*.sql, 0002_*.sql).
export const giftItemsTable = pgTable("gift_items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  emoji: text("emoji").notNull(),
  animationType: text("animation_type").notNull().default("sparkle"),
  rarity: text("rarity").notNull().default("common"),
  stars: integer("stars").notNull().default(1),
  price: integer("price").notNull().default(10),
  description: text("description").notNull().default(""),
  primeOnly: boolean("prime_only").notNull().default(false),
  imageUrl: text("image_url"),
});

export const insertGiftItemSchema = createInsertSchema(giftItemsTable).omit({ id: true });
export type InsertGiftItem = z.infer<typeof insertGiftItemSchema>;
export type GiftItem = typeof giftItemsTable.$inferSelect;

// A gift sent from one user to another (or to self, e.g. monthly Prime+ reward).
export const giftsTable = pgTable("gifts", {
  id: serial("id").primaryKey(),
  giftItemId: integer("gift_item_id").notNull().references(() => giftItemsTable.id),
  senderId: integer("sender_id").notNull().references(() => usersTable.id),
  receiverId: integer("receiver_id").notNull().references(() => usersTable.id),
  message: text("message"),
  isAnonymous: boolean("is_anonymous").notNull().default(false),
  chatId: integer("chat_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertGiftSchema = createInsertSchema(giftsTable).omit({ id: true, createdAt: true });
export type InsertGift = z.infer<typeof insertGiftSchema>;
export type Gift = typeof giftsTable.$inferSelect;

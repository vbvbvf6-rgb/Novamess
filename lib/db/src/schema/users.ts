import { pgTable, text, serial, timestamp, boolean, numeric, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  displayName: text("display_name").notNull(),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  avatarColor: text("avatar_color").notNull().default("#3B82F6"),
  status: text("status").notNull().default("offline"),
  statusText: text("status_text"),
  lastSeen: text("last_seen"),
  phoneNumber: text("phone_number"),
  isBot: boolean("is_bot").notNull().default(false),
  isVerified: boolean("is_verified").notNull().default(false),
  isAdmin: boolean("is_admin").notNull().default(false),
  ageGroup: text("age_group"),
  passwordHash: text("password_hash"),
  balance: numeric("balance").notNull().default("0"),
  hasPrime: boolean("has_prime").notNull().default(false),
  primeTier: text("prime_tier"),
  primeExpiresAt: timestamp("prime_expires_at", { withTimezone: true }),
  usernameChangedAt: timestamp("username_changed_at", { withTimezone: true }),
  birthDate: date("birth_date"),
  ageVerified: boolean("age_verified").notNull().default(false),
  idDocumentUrl: text("id_document_url"),
  totpSecret: text("totp_secret"),
  totpEnabled: boolean("totp_enabled").notNull().default(false),
  securityQuestion: text("security_question"),
  securityAnswer: text("security_answer"),
  email: text("email"),
  emailVerified: boolean("email_verified").notNull().default(false),
  emailVerificationCode: text("email_verification_code"),
  emailVerificationExpiresAt: timestamp("email_verification_expires_at", { withTimezone: true }),
  showOnlineStatus: boolean("show_online_status").notNull().default(true),
  readReceiptsEnabled: boolean("read_receipts_enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;

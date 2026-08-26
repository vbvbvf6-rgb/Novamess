import { pgTable, serial, text, boolean, timestamp, integer, jsonb, unique } from "drizzle-orm/pg-core";

export const platformEventsTable = pgTable("platform_events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  bannerColor: text("banner_color").default("#7c3aed"),
  startAt: timestamp("start_at"),
  endAt: timestamp("end_at"),
  isActive: boolean("is_active").default(true),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  eventType: text("event_type").default("event"),
  cost: integer("cost").default(0),
  conditions: text("conditions"),
  participantCount: integer("participant_count").default(0),
  prizeAmount: integer("prize_amount").default(0),
  prizeDescription: text("prize_description"),
  winnerId: integer("winner_id"),
  prizeAwardedAt: timestamp("prize_awarded_at"),
});

export const eventParticipantsTable = pgTable("event_participants", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull(),
  userId: integer("user_id").notNull(),
  joinedAt: timestamp("joined_at").defaultNow(),
}, (t) => ({
  uniq: unique("event_participants_unique").on(t.eventId, t.userId),
}));

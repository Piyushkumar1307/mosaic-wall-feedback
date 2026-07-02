import {
  integer,
  pgTable,
  real,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const feedback = pgTable("feedback", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const wallSlots = pgTable("wall_slots", {
  id: serial("id").primaryKey(),
  slotIndex: integer("slot_index").notNull().unique(),
  feedbackId: integer("feedback_id")
    .notNull()
    .references(() => feedback.id, { onDelete: "cascade" }),
  posX: real("pos_x").notNull().default(50),
  posY: real("pos_y").notNull().default(50),
  rotation: real("rotation").notNull().default(0),
  scale: real("scale").notNull().default(1),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const wallState = pgTable("wall_state", {
  id: integer("id").primaryKey().default(1),
  nextSlot: integer("next_slot").notNull().default(0),
  totalSubmitted: integer("total_submitted").notNull().default(0),
});

export type Feedback = typeof feedback.$inferSelect;
export type WallSlot = typeof wallSlots.$inferSelect;

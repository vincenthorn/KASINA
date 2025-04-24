import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  isWhitelisted: boolean("is_whitelisted").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Sessions table
export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  kasinaType: text("kasina_type").notNull(),
  kasinaName: text("kasina_name").notNull(),
  duration: integer("duration").notNull(), // in seconds
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

// Community video submissions
export const communityVideos = pgTable("community_videos", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  youtubeUrl: text("youtube_url").notNull(),
  embedId: text("embed_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Schema types
export const insertUserSchema = createInsertSchema(users);
export const insertSessionSchema = createInsertSchema(sessions);
export const insertCommunityVideoSchema = createInsertSchema(communityVideos);

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessions.$inferSelect;

export type InsertCommunityVideo = z.infer<typeof insertCommunityVideoSchema>;
export type CommunityVideo = typeof communityVideos.$inferSelect;

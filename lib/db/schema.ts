import {
  pgTable,
  pgEnum,
  uuid,
  text,
  doublePrecision,
  integer,
  timestamp,
  jsonb,
  primaryKey,
  char,
} from "drizzle-orm/pg-core";

const timestamptz = (name: string) => timestamp(name, { withTimezone: true });
import { relations } from "drizzle-orm";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const roleEnum = pgEnum("role", ["player", "admin"]);
export const difficultyEnum = pgEnum("difficulty", ["easy", "medium", "hard"]);
export const photoStatusEnum = pgEnum("photo_status", [
  "draft",
  "processing",
  "published",
  "rejected",
]);

// ─── Tables ───────────────────────────────────────────────────────────────────

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(), // mirrors auth.users.id
  displayName: text("display_name"),
  role: roleEnum("role").default("player").notNull(),
  countryCode: char("country_code", { length: 2 }),
  createdAt: timestamptz("created_at").defaultNow().notNull(),
});

export const photos = pgTable("photos", {
  id: uuid("id").primaryKey().defaultRandom(),
  uploaderId: uuid("uploader_id").references(() => profiles.id),
  title: text("title"),
  description: text("description"),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  heading: doublePrecision("heading").default(0).notNull(),
  altitude: doublePrecision("altitude"),
  capturedAt: timestamptz("captured_at"),
  difficulty: difficultyEnum("difficulty").default("medium").notNull(),
  status: photoStatusEnum("status").default("draft").notNull(),
  tileBaseUrl: text("tile_base_url"),
  tileManifest: jsonb("tile_manifest"),
  originalUrl: text("original_url"),
  thumbnailUrl: text("thumbnail_url"),
  createdAt: timestamptz("created_at").defaultNow().notNull(),
  updatedAt: timestamptz("updated_at").defaultNow().notNull(),
});

export const tags = pgTable("tags", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").unique().notNull(),
  name: text("name").notNull(),
  color: text("color").default("#6B7280").notNull(),
  createdAt: timestamptz("created_at").defaultNow().notNull(),
});

export const photoTags = pgTable(
  "photo_tags",
  {
    photoId: uuid("photo_id")
      .references(() => photos.id, { onDelete: "cascade" })
      .notNull(),
    tagId: uuid("tag_id")
      .references(() => tags.id, { onDelete: "cascade" })
      .notNull(),
  },
  (t) => [primaryKey({ columns: [t.photoId, t.tagId] })],
);

export const rounds = pgTable("rounds", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => profiles.id),
  anonSessionId: text("anon_session_id"),
  photoIds: jsonb("photo_ids").$type<string[]>().notNull(),
  startedAt: timestamptz("started_at").defaultNow().notNull(),
  completedAt: timestamptz("completed_at"),
  totalScore: integer("total_score"),
  shareImageUrl: text("share_image_url"),
  filterTagIds: jsonb("filter_tag_ids"),
  filterDifficulty: difficultyEnum("filter_difficulty"),
  createdAt: timestamptz("created_at").defaultNow().notNull(),
});

export const guesses = pgTable("guesses", {
  id: uuid("id").primaryKey().defaultRandom(),
  roundId: uuid("round_id")
    .references(() => rounds.id, { onDelete: "cascade" })
    .notNull(),
  photoId: uuid("photo_id")
    .references(() => photos.id)
    .notNull(),
  sequence: integer("sequence").notNull(), // 1–5
  guessLat: doublePrecision("guess_lat"),
  guessLng: doublePrecision("guess_lng"),
  distanceM: integer("distance_m"),
  timeSpentMs: integer("time_spent_ms"),
  score: integer("score"),
  actualLat: doublePrecision("actual_lat").notNull(), // snapshot
  actualLng: doublePrecision("actual_lng").notNull(),
  createdAt: timestamptz("created_at").defaultNow().notNull(),
});

// ─── Relations ────────────────────────────────────────────────────────────────

export const profilesRelations = relations(profiles, ({ many }) => ({
  photos: many(photos),
  rounds: many(rounds),
}));

export const photosRelations = relations(photos, ({ one, many }) => ({
  uploader: one(profiles, { fields: [photos.uploaderId], references: [profiles.id] }),
  photoTags: many(photoTags),
  guesses: many(guesses),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  photoTags: many(photoTags),
}));

export const photoTagsRelations = relations(photoTags, ({ one }) => ({
  photo: one(photos, { fields: [photoTags.photoId], references: [photos.id] }),
  tag: one(tags, { fields: [photoTags.tagId], references: [tags.id] }),
}));

export const roundsRelations = relations(rounds, ({ one, many }) => ({
  user: one(profiles, { fields: [rounds.userId], references: [profiles.id] }),
  guesses: many(guesses),
}));

export const guessesRelations = relations(guesses, ({ one }) => ({
  round: one(rounds, { fields: [guesses.roundId], references: [rounds.id] }),
  photo: one(photos, { fields: [guesses.photoId], references: [photos.id] }),
}));

// ─── Types ────────────────────────────────────────────────────────────────────

export type Profile = typeof profiles.$inferSelect;
export type Photo = typeof photos.$inferSelect;
export type Tag = typeof tags.$inferSelect;
export type Round = typeof rounds.$inferSelect;
export type Guess = typeof guesses.$inferSelect;
export type Difficulty = "easy" | "medium" | "hard";
export type PhotoStatus = "draft" | "processing" | "published" | "rejected";

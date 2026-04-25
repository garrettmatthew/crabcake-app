import {
  pgTable,
  text,
  doublePrecision,
  integer,
  numeric,
  boolean,
  timestamp,
  date,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  clerkId: text("clerk_id").notNull().unique(),
  email: text("email"),
  displayName: text("display_name"),
  avatarSwatch: text("avatar_swatch").default("g1"),
  avatarUrl: text("avatar_url"),
  homeCity: text("home_city").default("Baltimore, MD"),
  bio: text("bio"),
  role: text("role").notNull().default("user"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const spots = pgTable("spots", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  city: text("city").notNull(),
  neighborhood: text("neighborhood"),
  address: text("address"),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  priceLevel: integer("price_level").default(2),
  photoUrl: text("photo_url"),
  establishedYear: text("established_year"),
  boysScore: numeric("boys_score", { precision: 3, scale: 1 }),
  boysReviewDate: date("boys_review_date"),
  boysReviewPrep: text("boys_review_prep"),
  boysReviewQuote: text("boys_review_quote"),
  style: text("style"),
  prep: text("prep"),
  filler: text("filler"),
  size: text("size"),
  price: text("price"),
  side: text("side"),
  isPublished: boolean("is_published").notNull().default(true),
  googlePlaceId: text("google_place_id").unique(),
  phone: text("phone"),
  website: text("website"),
  hoursJson: text("hours_json"),
  googleRating: numeric("google_rating", { precision: 2, scale: 1 }),
  googleRatingCount: integer("google_rating_count"),
  venueType: text("venue_type"),
  createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const ratings = pgTable(
  "ratings",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    spotId: text("spot_id")
      .notNull()
      .references(() => spots.id, { onDelete: "cascade" }),
    score: numeric("score", { precision: 3, scale: 1 }).notNull(),
    note: text("note"),
    tags: text("tags").array(),
    // Legacy single-photo column. Kept for backward compat with old reads;
    // new writes go to photoUrls. Will eventually be dropped.
    photoUrl: text("photo_url"),
    photoUrls: text("photo_urls").array(),
    isBoysReview: boolean("is_boys_review").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userSpotUnique: uniqueIndex("ratings_user_spot_unique").on(t.userId, t.spotId),
    spotIdIdx: index("ratings_spot_id_idx").on(t.spotId),
    userIdIdx: index("ratings_user_id_idx").on(t.userId),
  })
);

export const bookmarks = pgTable(
  "bookmarks",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    spotId: text("spot_id")
      .notNull()
      .references(() => spots.id, { onDelete: "cascade" }),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userSpotUnique: uniqueIndex("bookmarks_user_spot_unique").on(t.userId, t.spotId),
    userIdIdx: index("bookmarks_user_id_idx").on(t.userId),
    spotIdIdx: index("bookmarks_spot_id_idx").on(t.spotId),
  })
);

export const collections = pgTable("collections", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  emoji: text("emoji"),
  gradient: text("gradient").notNull().default("g1"),
  position: integer("position").notNull().default(0),
  isPublished: boolean("is_published").notNull().default(true),
  createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const collectionSpots = pgTable(
  "collection_spots",
  {
    collectionId: text("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
    spotId: text("spot_id")
      .notNull()
      .references(() => spots.id, { onDelete: "cascade" }),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: { columns: [t.collectionId, t.spotId], name: "collection_spots_pkey" },
    collectionIdx: index("collection_spots_collection_idx").on(t.collectionId),
    spotIdx: index("collection_spots_spot_idx").on(t.spotId),
  })
);

export const tags = pgTable("tags", {
  id: text("id").primaryKey(),
  label: text("label").notNull().unique(),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const follows = pgTable(
  "follows",
  {
    id: text("id").primaryKey(),
    followerId: text("follower_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    followingId: text("following_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    unique: uniqueIndex("follows_unique").on(t.followerId, t.followingId),
  })
);

export const spotScoreHistory = pgTable(
  "spot_score_history",
  {
    id: text("id").primaryKey(),
    spotId: text("spot_id")
      .notNull()
      .references(() => spots.id, { onDelete: "cascade" }),
    changedBy: text("changed_by").references(() => users.id, {
      onDelete: "set null",
    }),
    previousScore: numeric("previous_score", { precision: 3, scale: 1 }),
    newScore: numeric("new_score", { precision: 3, scale: 1 }),
    previousQuote: text("previous_quote"),
    newQuote: text("new_quote"),
    kind: text("kind").notNull().default("updated"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    spotIdx: index("spot_score_history_spot_idx").on(t.spotId, t.createdAt),
  })
);

export const reactions = pgTable(
  "reactions",
  {
    id: text("id").primaryKey(),
    ratingId: text("rating_id")
      .notNull()
      .references(() => ratings.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    unique: uniqueIndex("reactions_unique").on(t.ratingId, t.userId, t.kind),
  })
);

export const reports = pgTable(
  "reports",
  {
    id: text("id").primaryKey(),
    spotId: text("spot_id")
      .notNull()
      .references(() => spots.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    reason: text("reason").notNull(),
    note: text("note"),
    status: text("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    statusIdx: index("reports_status_idx").on(t.status),
  })
);

export const submissions = pgTable("submissions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  city: text("city").notNull(),
  address: text("address"),
  note: text("note"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Spot = typeof spots.$inferSelect;
export type Rating = typeof ratings.$inferSelect;
export type NewRating = typeof ratings.$inferInsert;
export type Bookmark = typeof bookmarks.$inferSelect;

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
    photoUrl: text("photo_url"),
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

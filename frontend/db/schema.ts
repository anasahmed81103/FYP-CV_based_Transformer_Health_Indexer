// db/schema.ts

import {
    pgTable,
    serial,
    text,
    timestamp,
    pgEnum,
    // ALL required types consolidated here for both tables:
    jsonb,
    doublePrecision,
    varchar,
    integer
} from "drizzle-orm/pg-core";

// Define allowed roles (enum)
export const userRoleEnum = pgEnum("user_role", ["admin", "user", "suspended"]);

// Existing users table definition
export const users = pgTable("users", {
    id: serial("id").primaryKey(),

    // Modified to store names separately
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),

    email: text("email").unique().notNull(),
    password: text("password").notNull(),

    // Role field defines access and status
    role: userRoleEnum("role").default("user").notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),

    // Password Reset Fields
    resetToken: text("reset_token"),
    resetTokenExpiry: timestamp("reset_token_expiry"),

    // Email Verification Fields
    isEmailVerified: text("is_email_verified").default("false").notNull(),
    verificationToken: text("verification_token"),
    verificationTokenExpiry: timestamp("verification_token_expiry"),
});


// NEW TABLE: Analysis Logs
export const analysisLogs = pgTable("analysis_logs", {
    id: serial("id").primaryKey(),

    // Foreign key to link analysis to the user who performed it
    userId: integer("user_id").references(() => users.id).notNull(),

    // Form data fields
    transformerId: varchar("transformer_id", { length: 50 }).notNull(),
    location: text("location").notNull(),

    // Coords
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),

    // Timestamp from user form (input fields)
    inferenceDate: text("inference_date").notNull(),
    inferenceTime: text("inference_time").notNull(),

    // Analysis results
    healthIndexScore: doublePrecision("health_index_score").notNull(),

    // Store scores and image paths as JSONB
    paramsScores: jsonb("params_scores").notNull(),
    providedImages: jsonb("provided_images"),
    gradCamImages: jsonb("grad_cam_images"),

    // Analysis status
    status: varchar("status", { length: 20 }).notNull(),

    // Record of submission time
    createdAt: timestamp("created_at").defaultNow().notNull(),
});
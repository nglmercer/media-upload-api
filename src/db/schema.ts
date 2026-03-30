import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import type { FileCategory } from "../types/file";

// Tabla de usuarios
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").unique().notNull(),
  username: text("username").unique().notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: integer("created_at").notNull().$defaultFn(() => Date.now()),
  updatedAt: integer("updated_at").notNull().$defaultFn(() => Date.now()),
});

// Tabla de sesiones
export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: integer("expires_at").notNull(),
  createdAt: integer("created_at").notNull().$defaultFn(() => Date.now()),
});

// Tabla de intentos de login (para prevenir fuerza bruta)
export const loginAttempts = sqliteTable("login_attempts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull(),
  success: integer("success").notNull(), // 0 o 1
  ipAddress: text("ip_address"),
  timestamp: integer("timestamp").notNull().$defaultFn(() => Date.now()),
});

// Tabla de archivos
export const files = sqliteTable("files", {
  id: text("id").primaryKey(), // uuid
  name: text("name").notNull(),
  originalName: text("original_name").notNull(),
  category: text("category").notNull(), // FileCategory | SecurityCategory
  mimeType: text("mime_type"),
  extension: text("extension").notNull(),
  size: integer("size").notNull(),
  sizeFormatted: text("size_formatted").notNull(),
  status: text("status").notNull(), // FileStatus
  flags: text("flags", { mode: "json" }).notNull().$type<string[]>(),
  url: text("url").notNull(),
  isPublic: integer("is_public", { mode: "boolean" }).notNull().default(true),
  storagePath: text("storage_path").notNull(),
  integrity: text("integrity", { mode: "json" }).notNull().$type<{ sha256: string }>(),
  metadata: text("metadata", { mode: "json" }).$type<Record<string, any>>(),
  tags: text("tags", { mode: "json" }).$type<string[]>(),
  uploadedBy: text("uploaded_by"),
  uploadedAt: integer("uploaded_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
  deletedAt: integer("deleted_at"),
});

// Tabla de cuotas/uso
export const quota = sqliteTable("quota", {
  userId: text("user_id").primaryKey(), // '_global', '_anonymous' or actual userId
  usedFiles: integer("used_files").notNull(),
  usedStorage: integer("used_storage").notNull(),
  byCategory: text("by_category", { mode: "json" }).notNull().$type<Record<string, { count: number; storage: number }>>(),
});
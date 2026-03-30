import { drizzle } from "drizzle-orm/bun-sqlite";
import { Database } from "bun:sqlite";

const sqlite = new Database("auth.db");

// Initialize tables if not exist
sqlite.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
  );
`);

sqlite.run(`
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
  );
`);

sqlite.run(`
  CREATE TABLE IF NOT EXISTS login_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    success INTEGER NOT NULL,
    ip_address TEXT,
    timestamp INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
  );
`);

sqlite.run(`
  CREATE TABLE IF NOT EXISTS files (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    original_name TEXT NOT NULL,
    category TEXT NOT NULL,
    mime_type TEXT,
    extension TEXT NOT NULL,
    size INTEGER NOT NULL,
    size_formatted TEXT NOT NULL,
    status TEXT NOT NULL,
    flags TEXT NOT NULL,
    url TEXT NOT NULL,
    is_public INTEGER NOT NULL DEFAULT 1,
    storage_path TEXT NOT NULL,
    integrity TEXT NOT NULL,
    metadata TEXT,
    tags TEXT,
    uploaded_by TEXT,
    uploaded_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER
  );
`);

sqlite.run(`
  CREATE TABLE IF NOT EXISTS quota (
    user_id TEXT PRIMARY KEY,
    used_files INTEGER NOT NULL,
    used_storage INTEGER NOT NULL,
    by_category TEXT NOT NULL
  );
`);

export const db = drizzle(sqlite);

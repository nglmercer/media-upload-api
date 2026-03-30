import { db } from '../db/db';
import { files } from '../db/schema';
import { eq } from 'drizzle-orm';
import type { FileItem } from '../types/file';

export const fileStore = {
    async getAll() {
        const result = await db.select().from(files);
        return result.reduce((acc, row) => {
            acc[row.id] = row as FileItem;
            return acc;
        }, {} as Record<string, FileItem>);
    },

    async get(id: string): Promise<FileItem | undefined> {
        const [item] = await db.select().from(files).where(eq(files.id, id));
        return (item as FileItem) ?? undefined;
    },

    async save(id: string, file: FileItem): Promise<void> {
        await db.insert(files).values({
            ...file,
            id
        }).onConflictDoUpdate({
            target: files.id,
            set: {
                ...file
            }
        });
    },

    async delete(id: string): Promise<void> {
        await db.delete(files).where(eq(files.id, id));
    },

    async findByUrl(url: string): Promise<FileItem | undefined> {
        const [file] = await db.select().from(files).where(eq(files.url, url));
        return (file as FileItem) ?? undefined;
    },

    async findByCategory(category: string): Promise<FileItem[]> {
        const result = await db.select().from(files).where(eq(files.category, category));
        return result as FileItem[];
    },

    async findByStatus(status: string): Promise<FileItem[]> {
        const result = await db.select().from(files).where(eq(files.status, status));
        return result as FileItem[];
    },
};

// No longer needs specialized init as Drizzle is initialized in db.ts
export function initFileStore() {
    return fileStore;
}

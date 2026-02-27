import { JsonManager, JsonObjManager } from 'json-obj-manager';
import { FileAdapter } from 'json-obj-manager/node';
import path from 'path';
import { config } from '../config';
import type { FileItem } from '../types/file';

let JsonObj: JsonObjManager<FileItem>;

// Initialize storage
export function initFileStore(): JsonObjManager<FileItem> {
    const serverConfig = config.getServer();
    const filesPath = path.join(serverConfig.dataDir, 'files.json');

    const adapter = new FileAdapter<FileItem>(filesPath);
    const fileStorage = new JsonManager<FileItem>({
        adapter
    });
    JsonObj = fileStorage;
    return fileStorage;
}

// Helper to ensure storage is initialized
function getStorage(): JsonObjManager<FileItem> {
    if (!JsonObj) {
        JsonObj = initFileStore();
    }
    return JsonObj;
}

export const fileStore = {
    async getAll(): Promise<Record<string, FileItem>> {
        const result = await getStorage().getAll();
        return result as Record<string, FileItem>;
    },

    async get(id: string): Promise<FileItem | undefined> {
        const item = await getStorage().load(id);
        return (item as FileItem) ?? undefined;
    },

    async save(id: string, file: FileItem): Promise<void> {
        await getStorage().save(id, file);
    },

    async delete(id: string): Promise<void> {
        await getStorage().delete(id);
    },

    async findByUrl(url: string): Promise<FileItem | undefined> {
        const all = await this.getAll();
        return Object.values(all).find(f => f.url === url);
    },

    async findByCategory(category: string): Promise<FileItem[]> {
        const all = await this.getAll();
        return Object.values(all).filter(f => f.category === category);
    },

    async findByStatus(status: string): Promise<FileItem[]> {
        const all = await this.getAll();
        return Object.values(all).filter(f => f.status === status);
    },
};

// Allow overriding storage for tests
export function setFileStorage(storage: JsonObjManager<FileItem>) {
    JsonObj = storage;
}

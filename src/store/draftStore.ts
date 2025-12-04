import { DataStorage } from "json-obj-manager"
import { JSONFileAdapter } from "json-obj-manager/node"
import path from "path"
import { loadConfig } from "../config"
import type { Draft } from "./types"

let draftStorage: DataStorage<Draft>

// Initialize storage
export function initDraftStore() {
    const config = loadConfig()
    const mediaFile = config.mediaFile
    // Use a separate file for drafts, e.g., drafts.json in the same directory as media.json
    const draftsFile = path.join(path.dirname(mediaFile), 'drafts.json')

    const adapter = new JSONFileAdapter(draftsFile)
    draftStorage = new DataStorage<Draft>(adapter)
}

// Helper to ensure storage is initialized
function getStorage() {
    if (!draftStorage) {
        initDraftStore()
    }
    return draftStorage
}

export const draftStore = {
    async getAll(): Promise<Record<string, Draft>> {
        return getStorage().getAll()
    },

    async get(id: string): Promise<Draft | undefined> {
        return getStorage().load(id)
    },

    async save(id: string, draft: Draft): Promise<void> {
        await getStorage().save(id, draft)
    },

    async delete(id: string): Promise<void> {
        await getStorage().delete(id)
    }
}

// Allow overriding storage for tests
export function setDraftStorage(storage: DataStorage<Draft>) {
    draftStorage = storage
}

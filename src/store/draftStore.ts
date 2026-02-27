import { JsonManager, JsonObjManager } from "json-obj-manager"
import { FileAdapter } from "json-obj-manager/node"
import path from "path"
import { config } from "../config"
import type { Draft } from "./types"

let JsonObj: JsonObjManager<Draft>;

// Initialize storage
export function initDraftStore() {
    const serverConfig = config.getServer();
    const draftsFile = path.join(serverConfig.dataDir, 'drafts.json')

    const adapter = new FileAdapter<Draft>(draftsFile)
    const draftStorage = new JsonManager<Draft>({
        adapter
    })
    JsonObj = draftStorage
    return draftStorage
}

// Helper to ensure storage is initialized
function getStorage() {
    if (!JsonObj) {
        JsonObj = initDraftStore()
    }
    return JsonObj
}

export const draftStore = {
    async getAll(): Promise<Record<string, Draft>> {
        const result = await getStorage().getAll()
        return result as Record<string, Draft>
    },

    async get(id: string): Promise<Draft | undefined> {
        const item = await getStorage().load(id)
        return (item as Draft) ?? undefined
    },

    async save(id: string, draft: Draft): Promise<void> {
        await getStorage().save(id, draft)
    },

    async delete(id: string): Promise<void> {
        await getStorage().delete(id)
    }
}

// Allow overriding storage for tests
export function setDraftStorage(storage: JsonObjManager<Draft>) {
    JsonObj = storage
}

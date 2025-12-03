import { DataStorage } from 'json-obj-manager';
import { JSONFileAdapter } from 'json-obj-manager/node';
import path from 'path';
import type { MediaType, MediaItem } from './types';
import { loadConfig } from '../config';

const config = loadConfig();
const MediaPath = path.isAbsolute(config.mediaFile)
  ? config.mediaFile
  : path.join(process.cwd(), config.mediaFile);

class ProxyStorage {
  private _storage: DataStorage<MediaItem>;

  constructor(storage: DataStorage<MediaItem>) {
    this._storage = storage;
  }

  setTarget(storage: DataStorage<MediaItem>) {
    this._storage = storage;
  }

  async load(id: string): Promise<MediaItem | null> {
    return this._storage.load(id);
  }

  async save(id: string, data: MediaItem): Promise<void> {
    return this._storage.save(id, data);
  }

  async delete(id: string): Promise<void> {
    return this._storage.delete(id);
  }

  async getAll(): Promise<Record<string, MediaItem>> {
    return this._storage.getAll();
  }
}

const initialStorage = new DataStorage<MediaItem>(new JSONFileAdapter(MediaPath));
export const mediaStorage = new ProxyStorage(initialStorage);

export function setMediaStorage(storage: DataStorage<MediaItem>) {
  mediaStorage.setTarget(storage);
}

export async function ensureRecordForUrl(params: {
  type: MediaType
  url: string
  name?: string
  metadata?: Record<string, any>
}): Promise<MediaItem> {
  const { type, url, name, metadata } = params
  const all = await mediaStorage.getAll()

  // --- FIX IS HERE ---
  // Convert the 'all' object's values into an array, then search that array.
  const existing = Object.values(all).find((r) => r.url === url)

  if (existing) return existing

  const id = crypto.randomUUID()
  const record: MediaItem = {
    id,
    type,
    url,
    name: name ?? path.basename(url),
    metadata: metadata ?? {},
  }
  await mediaStorage.save(id, record)
  return record
}
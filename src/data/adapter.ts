import { SCHEMA_VERSION, type Envelope, type Snapshot } from "./schema";
import { parseEnvelope } from "./validate";

/**
 * Persistence boundary. The app talks only to this interface, so a remote
 * backend (e.g. Supabase) can replace local storage without touching the UI.
 */
export interface StorageAdapter {
  load(): Promise<Snapshot | null>;
  save(snapshot: Snapshot): Promise<void>;
  clear(): Promise<void>;
  /** Keeps one restorable copy, written before destructive operations. */
  backup(snapshot: Snapshot): Promise<void>;
  loadBackup(): Promise<Snapshot | null>;
  /** Called when another tab or device changed the data. */
  subscribe(onExternalChange: () => void): () => void;
}

export function toEnvelope(data: Snapshot): Envelope {
  return { app: "equilibrium", schemaVersion: SCHEMA_VERSION, exportedAt: new Date().toISOString(), data };
}

export class StorageFullError extends Error {
  constructor() {
    super("Browser storage is full. Export your data, then remove old entries.");
  }
}

export class LocalStorageAdapter implements StorageAdapter {
  constructor(private readonly namespace: string) {}

  private get key() {
    return `eq:${this.namespace}:data`;
  }

  private get backupKey() {
    return `eq:${this.namespace}:backup`;
  }

  private read(key: string): Snapshot | null {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    try {
      return parseEnvelope(JSON.parse(raw));
    } catch (error) {
      // Set unreadable data aside so a reset never destroys it.
      try {
        localStorage.setItem(`${key}:unreadable`, raw);
      } catch {
        /* storage full — leave the original in place */
      }
      throw error;
    }
  }

  private write(key: string, snapshot: Snapshot) {
    try {
      localStorage.setItem(key, JSON.stringify(toEnvelope(snapshot)));
    } catch (error) {
      if (error instanceof DOMException && (error.name === "QuotaExceededError" || error.code === 22)) throw new StorageFullError();
      throw error;
    }
  }

  async load() {
    return this.read(this.key);
  }

  async save(snapshot: Snapshot) {
    this.write(this.key, snapshot);
  }

  async clear() {
    localStorage.removeItem(this.key);
  }

  async backup(snapshot: Snapshot) {
    this.write(this.backupKey, snapshot);
  }

  async loadBackup() {
    return this.read(this.backupKey);
  }

  subscribe(onExternalChange: () => void) {
    const handler = (event: StorageEvent) => {
      if (event.key === this.key) onExternalChange();
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }
}

/**
 * Autosave of the current construction to `localStorage`, so the scene
 * survives navigating away and back (ConstructionApp unmounts on route
 * change) and closing/reopening the browser. Reuses file.ts's
 * serialize/parse — same format as a saved-to-disk file, just stored under
 * a browser key instead of downloaded.
 *
 * Both functions take the storage to use as an optional parameter (default:
 * `localStorage`) so the default — a browser-only global that doesn't exist
 * under vitest's node test environment — is only evaluated when the caller
 * doesn't supply one, keeping this testable with a plain in-memory fake.
 */

import type { Construction } from "../engine";
import { parseConstructionFile, serializeConstruction } from "./file";

const STORAGE_KEY = "poincare-disk-web:construction";

type ReadableStorage = Pick<Storage, "getItem">;
type WritableStorage = Pick<Storage, "setItem">;

/** The last-autosaved construction, or null if there isn't one, storage is
 * unavailable (e.g. private browsing), or the stored value doesn't parse. */
export function loadPersistedConstruction(
  storage: ReadableStorage = localStorage,
): Construction | null {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    return raw ? parseConstructionFile(raw) : null;
  } catch {
    return null;
  }
}

/** Best-effort save — silently drops the write if storage is unavailable or
 * full, since autosave is a convenience, not a guarantee. */
export function savePersistedConstruction(
  construction: Construction,
  storage: WritableStorage = localStorage,
): void {
  try {
    storage.setItem(STORAGE_KEY, serializeConstruction(construction));
  } catch {
    // Storage unavailable or full — nothing more we can do here.
  }
}

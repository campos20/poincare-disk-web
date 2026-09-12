import { describe, expect, it } from "vitest";
import { addFreePoint, emptyConstruction } from "../engine";
import {
  loadPersistedConstruction,
  savePersistedConstruction,
} from "./persistence";

/** Minimal in-memory stand-in for `localStorage`, so these tests don't need
 * a DOM (vitest runs this suite under the node environment). */
class FakeStorage {
  private readonly map = new Map<string, string>();
  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
}

describe("loadPersistedConstruction / savePersistedConstruction", () => {
  it("round-trips a saved construction", () => {
    const storage = new FakeStorage();
    const construction = addFreePoint(
      emptyConstruction(),
      0.2,
      -0.1,
    ).construction;

    savePersistedConstruction(construction, storage);
    expect(loadPersistedConstruction(storage)).toEqual(construction);
  });

  it("returns null when nothing has been saved", () => {
    expect(loadPersistedConstruction(new FakeStorage())).toBeNull();
  });

  it("returns null instead of throwing when the stored value is garbage", () => {
    const storage = new FakeStorage();
    storage.setItem("poincare-disk-web:construction", "not json");
    expect(loadPersistedConstruction(storage)).toBeNull();
  });

  it("returns null instead of throwing when storage.getItem throws", () => {
    const storage: Pick<Storage, "getItem"> = {
      getItem() {
        throw new Error("blocked");
      },
    };
    expect(loadPersistedConstruction(storage)).toBeNull();
  });

  it("silently drops the write when storage.setItem throws", () => {
    const storage: Pick<Storage, "setItem"> = {
      setItem() {
        throw new Error("quota exceeded");
      },
    };
    expect(() =>
      savePersistedConstruction(emptyConstruction(), storage),
    ).not.toThrow();
  });

  it("doesn't throw when no storage is passed and there's no global localStorage", () => {
    // vitest's node environment has no `localStorage` global at all, so
    // omitting the argument here exercises the exact case the default
    // parameter previously got wrong: resolving `localStorage` as the
    // parameter's default value throws a ReferenceError *before* the
    // function body's try/catch ever runs. Both calls must still honor the
    // documented "best effort, never throws" contract.
    expect(() => loadPersistedConstruction()).not.toThrow();
    expect(loadPersistedConstruction()).toBeNull();
    expect(() => savePersistedConstruction(emptyConstruction())).not.toThrow();
  });
});

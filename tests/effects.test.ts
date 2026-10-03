import { describe, expect, it } from "vitest";
import { DAY_LENGTH_MS, dayPhaseAt, dayState } from "../src/game/effects/dayCycle";
import { Pool } from "../src/game/effects/pool";
import {
  EFFECTS_KEY,
  effectsReduced,
  getReduceEffectsSetting,
  loadEffectsSetting,
  onEffectsSettingChange,
  setReduceEffects,
} from "../src/systems/effectsSettings";
import type { KeyValueStorage } from "../src/systems/quests/storage";

const memory = (): KeyValueStorage & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
};

describe("Pool", () => {
  it("creates every object up front and never grows", () => {
    let created = 0;
    const pool = new Pool(3, (i) => ({ i, id: created++ }));
    expect(created).toBe(3);
    const items = [pool.acquire(), pool.acquire(), pool.acquire()];
    expect(items.every((i) => i !== null)).toBe(true);
    expect(pool.acquire()).toBeNull();
    expect(created).toBe(3);
    expect(pool.active).toBe(3);
  });

  it("recycles released objects and ignores double releases", () => {
    const pool = new Pool(1, () => ({}));
    const a = pool.acquire();
    expect(a).not.toBeNull();
    if (a) pool.release(a);
    if (a) pool.release(a);
    expect(pool.active).toBe(0);
    expect(pool.acquire()).toBe(a);
    expect(pool.acquire()).toBeNull();
  });

  it("visits active objects and allows releasing while visiting", () => {
    const pool = new Pool(4, (i) => ({ i }));
    for (let n = 0; n < 4; n++) pool.acquire();
    const seen: number[] = [];
    pool.forEachActive((item) => {
      seen.push(item.i);
      pool.release(item);
    });
    expect(seen.sort()).toEqual([0, 1, 2, 3]);
    expect(pool.active).toBe(0);
    pool.releaseAll();
    expect(pool.active).toBe(0);
  });
});

describe("day cycle", () => {
  it("starts in full daylight with no tint", () => {
    expect(dayState(0)).toEqual({ evening: 0, tint: 0xffffff });
    expect(dayState(0.3).evening).toBe(0);
  });

  it("reaches evening and comes back to day, continuously", () => {
    expect(dayState(0.7).evening).toBe(1);
    expect(dayState(0.999).evening).toBeLessThan(0.05);
    let last = dayState(0);
    for (let p = 0.005; p <= 1; p += 0.005) {
      const now = dayState(p);
      expect(Math.abs(now.evening - last.evening), `evening jump at ${p}`).toBeLessThan(0.12);
      const channel = (c: number, shift: number) => (c >> shift) & 255;
      for (const shift of [16, 8, 0]) {
        expect(
          Math.abs(channel(now.tint, shift) - channel(last.tint, shift)),
          `tint jump at ${p}`,
        ).toBeLessThan(18);
      }
      last = now;
    }
  });

  it("never gets darker than a readable level", () => {
    for (let p = 0; p <= 1; p += 0.01) {
      const { tint } = dayState(p);
      for (const shift of [16, 8, 0]) expect((tint >> shift) & 255).toBeGreaterThanOrEqual(140);
    }
  });

  it("wraps phases and maps time onto a slow cycle", () => {
    expect(dayState(1.3)).toEqual(dayState(0.3));
    expect(dayState(-0.7)).toEqual(dayState(0.3));
    expect(dayPhaseAt(0)).toBe(0);
    expect(dayPhaseAt(DAY_LENGTH_MS / 2)).toBeCloseTo(0.5);
    expect(dayPhaseAt(DAY_LENGTH_MS * 3)).toBeCloseTo(0);
    expect(DAY_LENGTH_MS).toBeGreaterThanOrEqual(120_000);
  });
});

describe("reduce effects setting", () => {
  it("is on when either the OS preference or the in-game setting is on", () => {
    expect(effectsReduced(false, false)).toBe(false);
    expect(effectsReduced(true, false)).toBe(true);
    expect(effectsReduced(false, true)).toBe(true);
    expect(effectsReduced(true, true)).toBe(true);
  });

  it("persists, notifies once per change and survives corrupt data", () => {
    const store = memory();
    expect(loadEffectsSetting(store)).toBe(false);
    let calls = 0;
    const off = onEffectsSettingChange(() => calls++);
    setReduceEffects(true);
    setReduceEffects(true); // no change, no notification
    expect(calls).toBe(1);
    expect(getReduceEffectsSetting()).toBe(true);
    expect(JSON.parse(store.data.get(EFFECTS_KEY) ?? "{}")).toEqual({ reduce: true });
    expect(loadEffectsSetting(store)).toBe(true);
    store.setItem(EFFECTS_KEY, "{{not json");
    expect(loadEffectsSetting(store)).toBe(false);
    off();
    setReduceEffects(true);
    expect(calls).toBe(1);
    loadEffectsSetting(memory());
  });
});

import {
  EFFECT_SPRITE_BUDGET,
  POOL_SIZES,
  effectSpriteCount,
} from "../src/game/effects/effectBudget";
import { facingToward } from "../src/game/effects/npcActor";
import { MAX_SPARKLES, sparkleZones } from "../src/game/effects/hints";
import { MAP_IDS, getMap } from "../src/world/maps";

describe("performance budget", () => {
  it("keeps the number of pooled effect sprites under the budget", () => {
    expect(effectSpriteCount()).toBeLessThanOrEqual(EFFECT_SPRITE_BUDGET);
    expect(Object.values(POOL_SIZES).every((n) => n > 0)).toBe(true);
  });
});

describe("NPC facing", () => {
  it("looks along the dominant axis toward the player", () => {
    expect(facingToward(100, 100, 150, 105)).toBe("right");
    expect(facingToward(100, 100, 50, 95)).toBe("left");
    expect(facingToward(100, 100, 102, 160)).toBe("down");
    expect(facingToward(100, 100, 98, 40)).toBe("up");
  });
});

describe("hotspot sparkles", () => {
  it("only mark things you can use, never exits or people, and stay within the cap", () => {
    for (const id of MAP_IDS) {
      const zones = sparkleZones(getMap(id).zones);
      expect(zones.length).toBeLessThanOrEqual(MAX_SPARKLES);
      for (const z of zones) {
        expect(["item", "panel", "copy", "climb"]).toContain(z.action.type);
        expect(z.id).not.toBe("exit");
      }
    }
    expect(sparkleZones(getMap("workshop").zones).length).toBeGreaterThanOrEqual(10);
  });
});

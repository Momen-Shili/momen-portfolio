export type PanelId =
  | "projects"
  | "skills"
  | "contact"
  | "about"
  | "board"
  | "terminal"
  | "quests"
  | "quiz"
  | "celebration";

export type ZoneAction =
  | { type: "panel"; panel: PanelId }
  | { type: "enter"; map: string; spawn: string }
  | { type: "exit"; map: string; spawn: string }
  | { type: "dialog"; npc: string }
  | { type: "fish" }
  | { type: "gem"; group: "Advanced" | "Proficient" | "Growing" }
  | { type: "wish" };

/** Interaction area in world pixels. */
export interface Zone {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  prompt: string;
  action: ZoneAction;
  /** Collectible id: the zone disappears once the player owns this item. */
  item?: string;
}

function contains(z: Zone, px: number, py: number): boolean {
  return px >= z.x && px <= z.x + z.w && py >= z.y && py <= z.y + z.h;
}

function distanceToCenter(z: Zone, px: number, py: number): number {
  return Math.hypot(z.x + z.w / 2 - px, z.y + z.h / 2 - py);
}

/** The zone the player can currently interact with; the closest centre wins on overlap. */
export function findInteraction(px: number, py: number, zones: readonly Zone[]): Zone | null {
  let best: Zone | null = null;
  let bestDist = Infinity;
  for (const z of zones) {
    if (!contains(z, px, py)) continue;
    const d = distanceToCenter(z, px, py);
    if (d < bestDist) {
      best = z;
      bestDist = d;
    }
  }
  return best;
}

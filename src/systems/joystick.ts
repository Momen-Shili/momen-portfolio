import { normalizeAxis, type Axis } from "./input";

export const JOYSTICK_RADIUS = 44;
export const DEAD_ZONE = 0.22;

/**
 * Virtual joystick state, independent of the DOM. Only one pointer controls it at a time (a second
 * finger is ignored), and every way a drag can end - release anywhere, cancel, lost capture, the
 * controls being hidden - goes through `release`, so the stick can never stay stuck.
 */
export class JoystickModel {
  private activeId: number | null = null;
  private value: Axis = { x: 0, y: 0 };

  get axis(): Axis {
    return this.value;
  }

  get activePointer(): number | null {
    return this.activeId;
  }

  /** Starts a drag. Returns false when another pointer already holds the stick. */
  press(pointerId: number, dx: number, dy: number): boolean {
    if (this.activeId !== null) return false;
    this.activeId = pointerId;
    this.move(pointerId, dx, dy);
    return true;
  }

  /** `dx`/`dy` are offsets from the stick centre in pixels. */
  move(pointerId: number, dx: number, dy: number): void {
    if (pointerId !== this.activeId) return;
    const len = Math.hypot(dx, dy);
    const k = len > JOYSTICK_RADIUS ? JOYSTICK_RADIUS / len : 1;
    const x = (dx * k) / JOYSTICK_RADIUS;
    const y = (dy * k) / JOYSTICK_RADIUS;
    // The dead zone keeps a resting thumb from drifting the player.
    this.value = Math.hypot(x, y) < DEAD_ZONE ? { x: 0, y: 0 } : normalizeAxis(x, y);
  }

  /** Ends the drag for this pointer (or for any pointer when none is given). */
  release(pointerId?: number): void {
    if (pointerId !== undefined && pointerId !== this.activeId) return;
    this.activeId = null;
    this.value = { x: 0, y: 0 };
  }

  /** Where the knob should be drawn, in pixels from the centre. */
  get knob(): Axis {
    return { x: this.value.x * JOYSTICK_RADIUS, y: this.value.y * JOYSTICK_RADIUS };
  }
}

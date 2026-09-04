import { EventEmitter } from "events";

/** Process-local pub/sub used to push status changes to SSE clients.
 * Sufficient for a single backend instance; if the app is ever scaled
 * horizontally, swap this for a Redis pub/sub without touching callers. */
export const statusEvents = new EventEmitter();
statusEvents.setMaxListeners(0);

export const STATUS_CHANGED = "camera-status-changed";

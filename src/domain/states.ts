// Application lifecycle, exactly as in the state diagram.
//
//  Submitted --valid--> Validated --eligible--> Scored --queued--> In review --accept--> Shortlisted
//      |                    |                    ^  |                  |
//   invalid           knockout failed            +--+ rubric change    +--decline--> Declined
//      v                    v
//   Invalid             Ineligible
//
// Final states: invalid, ineligible, shortlisted, declined.

export const STATES = ["submitted", "invalid", "validated", "ineligible", "scored", "in_review", "shortlisted", "declined"] as const;
export type AppState = (typeof STATES)[number];

export const EVENTS = ["valid", "invalid", "eligible", "knockout_failed", "rubric_change", "queued", "accept", "decline"] as const;
export type AppEvent = (typeof EVENTS)[number];

const TRANSITIONS: Record<AppState, Partial<Record<AppEvent, AppState>>> = {
  submitted: { valid: "validated", invalid: "invalid" },
  validated: { eligible: "scored", knockout_failed: "ineligible" },
  scored: { rubric_change: "scored", queued: "in_review" },
  in_review: { accept: "shortlisted", decline: "declined" },
  invalid: {},
  ineligible: {},
  shortlisted: {},
  declined: {},
};

export const FINAL_STATES: readonly AppState[] = ["invalid", "ineligible", "shortlisted", "declined"];
export const isFinal = (s: AppState) => FINAL_STATES.includes(s);

/** Next state, or null when the event is not allowed from that state. */
export function nextState(from: AppState, event: AppEvent): AppState | null {
  return TRANSITIONS[from][event] ?? null;
}

export function allowedEvents(from: AppState): AppEvent[] {
  return Object.keys(TRANSITIONS[from]) as AppEvent[];
}

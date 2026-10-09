import test from "node:test";
import assert from "node:assert/strict";
import { allowedEvents, EVENTS, FINAL_STATES, isFinal, nextState, STATES } from "../src/domain/states.ts";

test("happy path follows the state diagram", () => {
  let s = nextState("submitted", "valid");
  assert.equal(s, "validated");
  s = nextState(s!, "eligible");
  assert.equal(s, "scored");
  s = nextState(s!, "queued");
  assert.equal(s, "in_review");
  assert.equal(nextState(s!, "accept"), "shortlisted");
  assert.equal(nextState("in_review", "decline"), "declined");
});

test("failure branches", () => {
  assert.equal(nextState("submitted", "invalid"), "invalid");
  assert.equal(nextState("validated", "knockout_failed"), "ineligible");
});

test("rubric change is a self-loop on Scored only", () => {
  assert.equal(nextState("scored", "rubric_change"), "scored");
  for (const s of STATES.filter((x) => x !== "scored")) assert.equal(nextState(s, "rubric_change"), null);
});

test("final states have no outgoing transitions", () => {
  assert.deepEqual([...FINAL_STATES].sort(), ["declined", "ineligible", "invalid", "shortlisted"]);
  for (const s of FINAL_STATES) {
    assert.ok(isFinal(s));
    assert.deepEqual(allowedEvents(s), []);
  }
});

test("everything not in the diagram is rejected", () => {
  assert.equal(nextState("validated", "queued"), null);
  assert.equal(nextState("scored", "accept"), null);
  assert.equal(nextState("shortlisted", "decline"), null);
  assert.equal(nextState("ineligible", "eligible"), null);
  const allowed = STATES.flatMap((s) => EVENTS.filter((e) => nextState(s, e)).map((e) => `${s}:${e}`));
  assert.equal(allowed.length, 8); // exactly the 8 arrows of the diagram
});

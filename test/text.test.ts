import test from "node:test";
import assert from "node:assert/strict";
import { canonSkill, containsTerm, fold, redactText, sentences } from "../src/domain/text.ts";
import { normalizeInput } from "../src/domain/normalize.ts";
import { totalMonths } from "../src/domain/months.ts";
import { NOW } from "./fixtures.ts";

test("fold removes accents and case", () => assert.equal(fold("  Université  DE Lomé "), "universite de lome"));

test("whole-term matching", () => {
  assert.ok(containsTerm("je connais javascript", "javascript"));
  assert.ok(!containsTerm("je connais javascript", "java"));
  assert.ok(containsTerm("stack c++ et node.js", "c++"));
  assert.ok(containsTerm("stack c++ et node.js", "node.js"));
});

test("skill aliases", () => {
  assert.equal(canonSkill("NodeJS"), "node.js");
  assert.equal(canonSkill("JS"), "javascript");
  assert.equal(canonSkill("Rust"), "rust");
});

test("normalizeInput trims, lowercases email and dedupes skills", () => {
  const out = normalizeInput({ email: "  Yawo@Example.ORG ", firstName: " Yawo ", skills: ["React", "react ", " ", "Git"], nested: [{ a: " x " }] }) as Record<string, unknown>;
  assert.equal(out.email, "yawo@example.org");
  assert.equal(out.firstName, "Yawo");
  assert.deepEqual(out.skills, ["React", "Git"]);
  assert.deepEqual(out.nested, [{ a: "x" }]);
});

test("sentences", () => assert.equal(sentences("Un deux trois. Quatre cinq six! Sept huit neuf").length, 3));

test("totalMonths counts overlaps once and ongoing up to now", () => {
  const r = (startDate: string, endDate: string, ongoing = false) => ({ startDate, endDate, ongoing });
  assert.equal(totalMonths([r("2025-06", "2025-09")], NOW), 4);
  assert.equal(totalMonths([r("2025-01", "2025-06"), r("2025-04", "2025-08")], NOW), 8); // Jan..Aug
  assert.equal(totalMonths([r("2026-08", "", true)], NOW), 3); // Aug, Sep, Oct 2026
  assert.equal(totalMonths([r("bad", "2025-01")], NOW), 0);
});

test("redactText removes identifiers", () => {
  const out = redactText("Je suis Yawo Agbeko, écrivez à yawo@example.org ou +228 90 00 00 00, voir https://github.com/yawo et @yawo_dev.", ["Yawo", "Agbeko"]);
  for (const leak of ["Yawo", "Agbeko", "example.org", "90 00", "github.com", "yawo_dev"]) assert.ok(!out.includes(leak), `leaked ${leak}: ${out}`);
  assert.ok(out.includes("[nom]") && out.includes("[email]") && out.includes("[lien]") && out.includes("[tel]") && out.includes("[pseudo]"));
});

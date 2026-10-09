import test from "node:test";
import assert from "node:assert/strict";
import { evaluate } from "../src/domain/scoring/engine.ts";
import { assignTier } from "../src/domain/scoring/tiers.ts";
import { DEFAULT_TIERS } from "../src/domain/defaults.ts";
import { CRITERIA } from "../src/domain/types.ts";
import { NOW, post, rubric, strong, weak } from "./fixtures.ts";

const run = (data = strong, r = rubric(), extra = {}) => evaluate({ data, post, rubric: r, now: NOW, ...extra });

test("scores a strong candidate high and a weak one low, with a full breakdown", async () => {
  const s = await run(strong);
  const w = await run(weak);
  assert.equal(s.eligible, true);
  assert.deepEqual(s.breakdown.map((b) => b.key), [...CRITERIA]);
  assert.ok(s.total! > 70, `strong=${s.total}`);
  assert.ok(w.total! < 40, `weak=${w.total}`);
  assert.ok(s.total! > w.total!);
  for (const b of s.breakdown) assert.ok(b.notes.length > 0 && b.score >= 0 && b.score <= 1);
});

test("total is the sum of weighted criterion points and never exceeds 100", async () => {
  const s = await run(strong);
  const sum = Math.round(s.breakdown.reduce((a, b) => a + b.points, 0) * 100) / 100;
  assert.equal(s.total, sum);
  assert.ok(s.total! <= 100 && s.total! >= 0);
});

test("deterministic: same input, same output", async () => {
  assert.deepEqual(await run(strong), await run(strong));
});

test("skills: listed beats mentioned beats absent", async () => {
  const r = rubric();
  r.skills = { required: ["Docker"], preferred: [] };
  const listed = await run({ ...strong, skills: ["Docker"] }, r);
  const mentioned = await run({ ...strong, skills: ["Git"], projectProud: strong.projectProud + " Déployé avec Docker." }, r);
  const absent = await run({ ...strong, skills: ["Git"] }, r);
  const skills = (x: typeof listed) => x.breakdown.find((b) => b.key === "skills")!.score;
  assert.equal(skills(listed), 1);
  assert.equal(skills(mentioned), 0.6);
  assert.equal(skills(absent), 0);
});

test("experience maps months to the range table", async () => {
  const e = (x: Awaited<ReturnType<typeof run>>) => x.breakdown.find((b) => b.key === "experience")!.score;
  assert.equal(e(await run({ ...strong, experience: [] })), 0);
  assert.equal(e(await run(strong)), 0.55); // 7 months -> 6+ step
  assert.equal(e(await run({ ...strong, experience: [{ role: "Dev", company: "X", startDate: "2022-01", ongoing: true, endDate: "", description: "" }] })), 1);
});

test("knockouts make a candidate ineligible and skip scoring", async () => {
  const r = rubric();
  r.knockouts = [{ type: "required_skills", skills: ["Python"], mode: "all" }, { type: "country_in", countries: ["Togo", "Bénin"] }];
  const res = await run(weak, r);
  assert.equal(res.eligible, false);
  assert.equal(res.total, null);
  assert.equal(res.tier, null);
  assert.equal(res.knockouts.length, 2);
  assert.equal((await run(strong, { ...r, knockouts: [{ type: "country_in", countries: ["togo"] }] })).eligible, true); // accent/case-insensitive
});

test("min_education counts ongoing studies one level lower", async () => {
  const r = rubric();
  r.knockouts = [{ type: "min_education", level: "licence" }];
  const ongoing = { ...strong, education: [{ ...strong.education[0], ongoing: true, endDate: "" }] };
  assert.equal((await run(strong, r)).eligible, true);
  assert.equal((await run(ongoing, r)).eligible, false);
});

test("re-scoring without enforcement keeps the score and flags the failure", async () => {
  const r = rubric();
  r.knockouts = [{ type: "required_skills", skills: ["Python"], mode: "all" }];
  const res = await run(strong, r, { enforceKnockouts: false });
  assert.equal(res.eligible, false);
  assert.ok(res.total !== null);
  assert.ok(res.flags.some((f) => f.code === "knockout_after_rubric_change" && f.severity === "high"));
});

test("tiers come from thresholds; a rubric may override them", () => {
  assert.equal(assignTier(80, DEFAULT_TIERS), "A");
  assert.equal(assignTier(75, DEFAULT_TIERS), "A");
  assert.equal(assignTier(74.99, DEFAULT_TIERS), "B");
  assert.equal(assignTier(0, DEFAULT_TIERS), "D");
});

test("flags: missing data and borderline", async () => {
  const w = await run(weak);
  const codes = w.flags.map((f) => f.code);
  for (const c of ["no_cv", "no_project_link", "few_skills", "education_unrecognized", "no_github", "no_experience", "short_letter"]) assert.ok(codes.includes(c), c);
  const s = await run(strong, rubric(), { configuredTiers: [{ tier: "A", min: Math.round((await run(strong)).total!) + 1 }, { tier: "B", min: 0 }] });
  assert.ok(s.flags.some((f) => f.code === "borderline"));
  assert.ok((await run(strong, rubric(), { returning: true })).flags.some((f) => f.code === "returning_candidate"));
});

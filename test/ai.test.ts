import test from "node:test";
import assert from "node:assert/strict";
import { anonymize, assignAliases, buildPrompt, fallbackTop3, validateTop3, type PoolCandidate } from "../src/domain/ai.ts";
import { evaluate } from "../src/domain/scoring/engine.ts";
import { parseCertificates, parseEducation, parseExperience, rowToSubmission, safeCell, CsvFormatError } from "../src/domain/csv.ts";
import { NOW, post, rubric, strong, weak } from "./fixtures.ts";

async function pool(): Promise<PoolCandidate[]> {
  const mk = async (id: string, data: typeof strong, extra: Partial<PoolCandidate> = {}): Promise<PoolCandidate> => {
    const r = await evaluate({ data, post, rubric: rubric(), now: NOW });
    return { applicationId: id, data, total: r.total!, tier: r.tier!, breakdown: r.breakdown, flags: r.flags, adjustment: 0, adjustmentReason: null, notes: [], ...extra };
  };
  return [
    await mk("app-1", strong, { notes: ["Yawo Agbeko a un bon dossier, contact yawo@example.org"], adjustment: 3, adjustmentReason: "Projet impressionnant de Yawo" }),
    await mk("app-2", { ...strong, firstName: "Fatou", lastName: "Sow", skills: ["Git"] }),
    await mk("app-3", weak),
    await mk("app-4", { ...weak, firstName: "Mehdi", lastName: "Benali" }),
  ];
}

test("anonymized prompt contains no identifying information", async () => {
  const p = await pool();
  const aliases = assignAliases(p.map((c) => c.applicationId));
  const anon = p.map((c, i) => anonymize(`C${i + 1}`, c, NOW));
  const { system, user } = buildPrompt({
    post: { title: post.title, organisation: post.organisation, description: "d", missions: [], mustHave: [], niceToHave: [] },
    rubric: { weights: rubric().weights, requiredSkills: ["JavaScript"], preferredSkills: [] },
    candidates: anon,
  });
  const text = system + user;
  for (const leak of ["Yawo", "Agbeko", "Fatou", "Sow", "Grace", "Nkemelu", "Benali", "@example.org", "github.com", "+228", "app-1", "linkedin.com"]) {
    assert.ok(!text.includes(leak), `prompt leaks "${leak}"`);
  }
  assert.ok(user.includes('"id": "C1"'));
  assert.equal(aliases.get("C1"), "app-1");
  assert.ok(system.includes("DONNÉES"), "prompt-injection guard present");
});

test("validateTop3 accepts a good answer and rejects bad ones", () => {
  const ids = ["C1", "C2", "C3", "C4"];
  const item = (id: string) => ({ id, strengths: ["a"], risks: ["b"], questions: ["c"] });
  assert.equal(validateTop3({ top3: [item("C1"), item("C2"), item("C3")] }, ids).ok, true);
  assert.equal(validateTop3({ top3: [item("C1"), item("C2")] }, ids).ok, false); // only 2
  assert.equal(validateTop3({ top3: [item("C1"), item("C1"), item("C3")] }, ids).ok, false); // duplicate
  assert.equal(validateTop3({ top3: [item("C1"), item("C2"), item("C9")] }, ids).ok, false); // unknown id
  assert.equal(validateTop3({ top3: [item("C1"), item("C2"), { ...item("C3"), risks: [] }] }, ids).ok, false); // no risks
  assert.equal(validateTop3("garbage", ids).ok, false);
  assert.equal(validateTop3(null, ids).ok, false);
});

test("fallback picks the top 3 by deterministic score with derived reasons", async () => {
  const p = await pool();
  const top = fallbackTop3(p, (id) => `alias-${id}`);
  assert.equal(top.length, 3);
  const best = [...p].sort((a, b) => b.total - a.total).slice(0, 3).map((c) => `alias-${c.applicationId}`);
  assert.deepEqual(top.map((t) => t.id), best);
  for (const t of top) assert.ok(t.strengths.length && t.risks.length && t.questions.length);
});

test("CSV compact formats", () => {
  assert.deepEqual(parseEducation("Licence info@Université de Lomé:2023-10..|BAC@Lycée:2020-09..2023-06"), [
    { degree: "Licence info", institution: "Université de Lomé", startDate: "2023-10", endDate: "", ongoing: true, fileName: "" },
    { degree: "BAC", institution: "Lycée", startDate: "2020-09", endDate: "2023-06", ongoing: false, fileName: "" },
  ]);
  assert.equal(parseExperience("Stagiaire@Agence Web:2025-06..2025-09")[0].endDate, "2025-09");
  assert.equal(parseExperience("Dev@X:2025-06..present")[0].ongoing, true);
  assert.equal(parseCertificates("JS Algorithms@freeCodeCamp:2025-03")[0].issuer, "freeCodeCamp");
  assert.deepEqual(parseEducation(""), []);
  assert.throws(() => parseEducation("n'importe quoi"), CsvFormatError);
  assert.throws(() => parseExperience("Dev@X:2025-6..2025-9"), CsvFormatError);
});

test("rowToSubmission builds the same shape as the web form", () => {
  const s = rowToSubmission({ first_name: " Yawo ", email: "A@B.org", skills: "React; Git, SQL", education: "Licence@Univ:2022-10..2025-07" });
  assert.deepEqual(s.skills, ["React", "Git", "SQL"]);
  assert.equal(s.consent, true);
  assert.equal(s.cvMode, "manual");
  assert.equal((s.education as unknown[]).length, 1);
});

test("safeCell neutralises spreadsheet formulas but keeps numbers", () => {
  assert.equal(safeCell("=HYPERLINK(\"http://evil\")"), "'=HYPERLINK(\"http://evil\")");
  assert.equal(safeCell("+33 1"), "'+33 1");
  assert.equal(safeCell("@SUM(A1)"), "'@SUM(A1)");
  assert.equal(safeCell("Yawo"), "Yawo");
  assert.equal(safeCell(-3), -3);
});

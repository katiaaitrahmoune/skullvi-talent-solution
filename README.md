# SKULLVI Talent Engine: API

Node.js + Express 5 + TypeScript, **PostgreSQL 16**, built to the four diagrams (use case, activity, state, AI top 3).

## Run it

```bash
cp .env.example .env            # set JWT_SECRET (32+ chars), ADMIN_PASSWORD (10+ chars)
docker compose up -d            # PostgreSQL
npm install
npm run db:seed:demo            # migrates, creates the admin (+ 2 demo reviewers and an open demo post)
npm run dev                     # http://localhost:4000/api/health
npm test                        # 28 unit tests, no database needed
```

Then point the frontend at it: `NEXT_PUBLIC_API_URL=http://localhost:4000` (the form already posts to `/api/applications`).

## Why PostgreSQL

The data is relational and integrity matters: one candidate per e-mail, one application per person per offer, append-only evaluations that remember the rubric version, an audit trail. PostgreSQL gives real constraints and transactions (an application, its candidate row, its evaluation and its state change commit together or not at all), `jsonb` for the flexible parts (rubric config, breakdown, flags), and window functions for the ranking. SQL is plain (`pg` + `migrations/*.sql`): no ORM, no code generation.

## Using Neon (hosted PostgreSQL)

Works as-is: create a Neon project, copy its connection string into `DATABASE_URL` (keep `sslmode=require`), then `npm run db:seed:demo`.
The pooled endpoint (`-pooler`) is fine: every transaction here runs on a single connection and no named prepared statements are used.
Idle connections and cold starts are handled (`db/pool.ts`).

## Deploying on Render (Web Service)

* **Build command:** `npm install && npm run build`
* **Pre-deploy command** (or run once from the Shell): `npm run db:migrate:prod`, then `npm run db:seed:prod` the first time (creates the admin)
* **Start command:** `npm start`
* **Environment:** `DATABASE_URL` (Neon), `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `CORS_ORIGIN` (your frontend URL, comma-separated if several), `NODE_ENV=production`, **`TRUST_PROXY=1`** (Render sits behind a proxy; without it rate limiting sees one IP for everybody), optional `ANTHROPIC_API_KEY`
* Health check path: `/api/health`
* Uploaded CVs are written to `UPLOAD_DIR`; Render's disk is **ephemeral** unless you attach a persistent disk and point `UPLOAD_DIR` to it.

## Diagram → code

| Diagram | Where |
|---|---|
| **Use case**: Submit application (includes Validate data, Calculate score) | `POST /api/applications` → `services/pipeline.ts` |
| Admin: Create post / Define rubric / Import CSV | `routes/staff.ts`, `services/posts.ts`, `services/rubrics.ts`, `services/imports.ts` |
| Reviewer: View ranked list / Add note, adjust / Export CSV | `services/ranking.ts`, `services/applications.ts`, `services/imports.ts` |
| **Activity**: Normalize → Validators | `domain/normalize.ts`, `domain/submission.ts` |
| Known email? Reuse record / Create candidate | `persistAndScore`: `insert … on conflict (email) do update … returning (xmax = 0)` |
| Save application (validated) | `applications` row created in state `validated` |
| Load post and rubric (current version) | `loadPostAndRubric` (`rubrics` is versioned, never edited) |
| Eligible? → Ineligible | `domain/eligibility.ts` (knockouts) |
| Fork: Skills / Projects / Motivation / Experience / Education / Profile | `domain/scoring/*.ts`, run with `Promise.all` in `engine.ts` |
| Sum weighted score → Assign tier → Generate flags | `engine.ts`, `tiers.ts` (thresholds from `TIERS_JSON`), `flags.ts` |
| Save evaluation (score, tier, audit log) | `evaluations` (append-only) + `audit_log` |
| Update ranking (sort by total) | computed at read time, always current |
| **State**: Submitted/Validated/Scored/In review/Shortlisted/Declined/Invalid/Ineligible | `domain/states.ts` (the 8 arrows, tested), enforced by `transition()` |
| Scored ↺ rubric change | `rescoreScored`: new rubric version re-scores everything still `scored` |
| **AI top 3**: select 10 → anonymize → prompt → model → valid? → fallback → log → reviewer confirms | `domain/ai.ts` (pure, tested), `services/ai/*`, table `ai_runs` |

## The scoring (deterministic: same input, same score)

Weights come from the rubric and add up to 100. Each criterion yields 0..1 plus human-readable notes (stored as the "breakdown").

| Criterion | How it is computed |
|---|---|
| Skills | Rubric keywords: 1 if listed as a skill, 0.6 if only mentioned in project/experience text, else 0. Required 70 %, preferred 30 %. Aliases handled (`NodeJS`=`node.js`) |
| Projects | Links 50 % (project .25, GitHub .15, portfolio .10; syntax check, no network call) + project story completeness 50 % |
| Motivation | Cover letter: length 30 %, vocabulary diversity 25 %, structure 20 %, relevance to the post 25 % |
| Experience | Months worked (overlaps counted once) → points via the rubric's range table |
| Education | Rule table of regexes on the degree; best match wins; ongoing studies count 90 % |
| Profile | Share of 8 useful fields filled (phone, LinkedIn, GitHub, portfolio, CV, certificates, expectations, languages) |

Knockouts (eligibility): `min_education`, `required_skills` (all/any), `language`, `country_in`.
Tiers: A ≥ 75, B ≥ 55, C ≥ 35, D (override with `TIERS_JSON` or per rubric). Flags: borderline (within `BORDERLINE_MARGIN` of a threshold), no CV, no project link, few skills, unrecognised education, returning candidate…

## API

Candidates are public; staff use `Authorization: Bearer <token>` from `POST /api/auth/login`.
Errors: `{ code, message, issues? }`: `422 invalid` (issues by field), `409 duplicate`, `404 closed`.

| | Endpoint | Who |
|---|---|---|
| Public | `GET /api/posts`, `GET /api/posts/:id` (open offers) | anyone |
| | `POST /api/applications` (multipart: `data` JSON + files `cv`, `edu-<i>`, `cert-<i>`) → `201 { reference }` | anyone |
| Auth | `POST /api/auth/login`, `GET /api/auth/me` | |
| Offers | `GET/POST /api/staff/posts`, `GET/PATCH /api/staff/posts/:id`, `POST …/status`, `PUT …/reviewers`, `POST …/queue` | admin (GET: assigned reviewers too) |
| Rubric | `GET/POST /api/staff/posts/:id/rubric` (POST = new version + re-scoring) | admin |
| Import | `GET /api/staff/imports/template.csv`, `POST /api/staff/imports` (multipart `postId`, `consentConfirmed=true`, `file`) | admin |
| Review | `GET …/posts/:id/ranking?status=&tier=&q=&limit=&offset=`, `GET …/posts/:id/export.csv` | reviewer/admin |
| | `GET …/applications/:id`, `POST …/notes`, `POST …/adjustments` (±20 + reason), `POST …/decision` (`accept`/`decline`), `GET …/files/:field` | reviewer/admin |
| AI | `POST/GET …/posts/:id/ai/top3`, `POST …/ai-runs/:id/confirm { order: [applicationId…] }` | reviewer/admin |
| Users | `GET/POST /api/staff/users`, `PATCH …/users/:id` | admin |

Reviewers only see offers they are assigned to.

## Decisions where the diagrams were silent or ambiguous

1. **Invalid submissions are not stored as applications.** The activity diagram sends the candidate back to fix errors; the application row is created directly as `validated`. The `Submitted → Invalid` arrow exists in the state machine, and every invalid attempt is written to `audit_log` (field names only, no personal data).
2. **Duplicates.** A known e-mail reuses the candidate record and flags the application as `returning_candidate`, as drawn. Applying twice to the **same** offer is refused with `409 duplicate` (it would pollute the ranking).
3. **"Queued" (Scored → In review)** happens right after scoring when the offer has `auto_queue` (default). Otherwise the admin releases candidates with `POST …/queue`.
4. **Rubric change** only re-scores applications still `Scored`, exactly as the self-loop shows. Candidates already in review keep the evaluation they were judged on (`stale: true` in the ranking tells you). If a new knockout would fail a `Scored` candidate, they are flagged `high`, not moved (the diagram has no such arrow).
5. **"Adjust"** = a ±20-point correction with a mandatory reason; the latest replaces the previous. Ranking sorts by adjusted score, then raw score, then arrival.
6. **AI selection** uses the deterministic score as drawn (`AI_SELECT_BY=effective` to include adjustments). "Reject" in "Reviewer confirms" means dropping a *suggestion*; it does not decline the candidate. Accepted ones move `In review → Shortlisted`.
7. **Anonymization** removes name, e-mail, photo **and** phone, links, @handles, and the candidate's own name inside free text; aliases `C1…` are shuffled per run. Candidate text is marked as data in the prompt (prompt-injection guard). The model is forced to answer through a tool call; any invalid answer, timeout or missing API key falls back to top 3 by score, with reasons derived from the breakdown. The exact prompt, raw output and model version are stored in `ai_runs`.

## Security notes

bcrypt passwords, short-lived JWT re-checked against the user row on every request (deactivation is immediate), rate limits on login and applications, file type sniffed from bytes (PDF/Word/PNG/JPEG, 5 MB), safe file paths, CSV-injection guard on export, parameterised SQL everywhere, `helmet`, CORS allow-list. Candidate responses never include score or status.

## Not done / limits

* **Never run against a real PostgreSQL in my environment.** The domain logic (state machine, scoring, eligibility, anonymization, CSV parsing, AI validation/fallback) is covered by 28 passing tests; the SQL, routes and Express wiring were type-checked but not executed. Expect to fix small things on first run, and please run `npm run typecheck` once packages are installed.
* No integration tests, no Dockerfile, no e-mail notifications.
* The link check is syntactic (no HTTP request). A reachability check can be added inside `scoring/projects.ts` (criteria already run asynchronously).
* Rescoring runs inside the rubric request (fine for hundreds of applications, move to a queue for thousands).
* Files are stored on local disk (`UPLOAD_DIR`); use object storage in production.
* The validation rules duplicate the frontend's `src/lib/schema.ts`; consider a shared package.
* The CSV template contains one example row: delete it before importing real data.

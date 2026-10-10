# SKULLVI Talent Engine: Application front end

Next.js 14 (App Router) + TypeScript + Tailwind CSS + Framer Motion.
Flow: `/` (offers) → Postuler → `/apply/<id>` (CV, Formation, Expérience & certificats, Compétences, Projet, Questions, Lettre, Récapitulatif, Confirmation).
Experience and certificates are optional. The project story (what, difficulty, solution) is required.

## Run

```bash
npm install
cp .env.example .env.local
npm run dev        # http://localhost:3000
npm run typecheck
npm run build
```

Offers live in `src/lib/posts.ts` (2 of them are samples). CV extraction: `src/app/api/cv/extract/route.ts` (PDF/TXT).

## Structure

```
src/
├─ app/
│  ├─ layout.tsx, page.tsx, globals.css   # shell + THEME TOKENS
│  └─ api/applications/route.ts           # mock backend (201 / 409 / 422)
├─ components/
│  ├─ brand/Logo.tsx                      # animated logo (placeholder or real file)
│  ├─ apply/
│  │  ├─ ApplyWizard.tsx                  # state, validation per step, submit
│  │  └─ steps/                           # one component per step
│  └─ ui/                                 # Button, fields (floating labels), SkillsInput, FileAttach
└─ lib/
   ├─ schema.ts    # zod schemas = single source of truth for validation
   ├─ api.ts       # submitApplication(), error mapping
   ├─ copy.ts      # step titles/text (French). Order = wizard order

   ├─ options.ts, posts.ts, cn.ts
```

## SKULLVI brand

Colors are taken from skullvi.org and live as CSS variables at the top of `src/app/globals.css`
(orange `#E14313`, night `#01010C`, page `#F8F9FA`, plus the green/yellow of the ribbon).
Logo: `public/logo.png` and `public/logo-white.png` are low-res crops; drop the official SVG in `public/`
and set `NEXT_PUBLIC_LOGO_SRC=/logo.svg`. Font: IBM Plex Sans (`layout.tsx`, `tailwind.config.ts`).
Header and footer are shared in `src/components/brand/`.

## Connect the real backend

Set `NEXT_PUBLIC_API_URL=http://localhost:8000`. The front end expects `POST /api/applications` to return:

| Status | Meaning | Body |
|---|---|---|
| 201 | saved | `{ "reference": "SKV-2026-XXXXX" }` |
| 409 | same email already applied to this post | any |
| 422 | validation failed | any |

Keep `src/lib/schema.ts` and the backend (Pydantic) validation rules aligned.

## Animation

- One orchestrated entrance: card, logo drawing, stepper items.
- Interaction feedback: step slide, progress line fill, chips, error messages, checkmark drawing.
- `MotionConfig reducedMotion="user"`: users who prefer reduced motion get no movement animation.

## Accessibility

Labels linked to inputs, `aria-invalid` + `role="alert"` errors, focus moves to the step title on each step,
`aria-current="step"` on the rail, visible keyboard focus, mobile layout with a compact progress bar.

## Limitations / next steps

- The mock API stores nothing durable (in-memory duplicate check only).
- Draft autosave, CSV bulk import and the admin ranking screen are not part of this front end yet.
- Placeholder palette and logo until the official assets are plugged in.

## Connected to the API

This site holds no data: it talks to the Talent Engine API (`NEXT_PUBLIC_API_URL`, default `https://skullvi-talent-solution.onrender.com`).

| Who | URL on your deployed site | What |
|---|---|---|
| Candidates | `/` and `/apply/<offer id>` | public offers and the application form |
| Staff | `/admin/login` then `/admin` | dashboard, offers, scoring grid, ranking, candidate review, team |

Admin sign-in uses the backend accounts (the admin created by `db:seed`). The token is kept in an httpOnly cookie on this site and used server-side only.
Downloads (CSV export, CVs) go through `/admin/download/...`, which adds the token.

**On the backend side** set `CORS_ORIGIN` to this site's URL (the application form posts straight from the browser to the API).
A free Render API sleeps after inactivity: the first request can take up to a minute (pages show a friendly message).

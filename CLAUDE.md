# CLAUDE.md — PANTAU / Portal Antar Unit untuk Monitoring Terpadu

This file gives Claude (and any human dev) the context needed to build, extend, or debug this project without re-explaining it every session.

## 1. What this project is

An internal progress-monitoring web app for **PANTAU / Portal Antar Unit untuk Monitoring Terpadu** at Bank Indonesia — DPAN (Departemen Pengelolaan Aset Perkantoran).

Today, progress is tracked two ways, manually:
1. A weekly narrative update ("Progres" + "Rencana Tindak Lanjut") that each project team writes for the Rakor Mingguan (weekly coordination meeting), currently compiled by hand into a PowerPoint.
2. A checklist of standard deliverables per project (RBT, RPP, RBTek, KAK, SPPP, Kick Off, BAST 1, BAST 2, ...), currently tracked in `sample_data.xlsx`.

The admin currently collects both by contacting each of ** teams (uker)** individually every week. This app replaces that manual collection with a shared input tool + an admin dashboard.

**Role naming: it's "Admin", not "Supervisor".** Earlier drafts of this file and the mockup called the read-only oversight role "Supervisor" — that's been renamed everywhere in the app (nav, page titles, sidebar) per explicit request (2026-09-03). If you see "Supervisor" anywhere in code or copy, it's stale — fix it to "Admin", don't reintroduce it.

**This is a POC.** Original plan was Power Apps + Excel; that has been replaced with a free, code-based stack (below) so it can run live beyond the POC without a licensing dependency.

**Language: the app's UI is entirely in Bahasa Indonesia** — labels, buttons, status text, error messages, everything a user sees. This mirrors the source spreadsheet and the Rakor Mingguan meeting itself; do not introduce English UI copy. Code (variable names, comments, commit messages) stays in English as normal.

A working **HTML/JS visual mockup** of the intended UX already exists (`example_design.html` — copy it into the repo under this path when you start). Treat it as the UX spec: screen layout, interaction patterns (compose-then-log, checklist detail capture, drawer), copy in Bahasa Indonesia, and the visual design system are all already decided there. Don't redesign from scratch — port it to real components and wire it to a real database.

## 2. Tech stack (POC — must stay $0 to run, incl. if it goes live)

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 14 (App Router, TypeScript)**, pinned to `14.2.35` | One repo for frontend + API routes, deploys natively to Vercel, generous free tier. Pinned to the 14.x line (not 15/16) because those versions make `cookies()`/`headers()`/route `params` async, which would be a breaking rewrite; `14.2.35` is the latest 14.x patch and clears the *critical* CVEs, but a handful of *high*-severity advisories (Server Actions DoS, Image Optimization, WebSocket upgrade SSRF — none of which this app uses) are only fixed in 15/16. Revisit before a real go-live. |
| Hosting/CI | **Vercel (Hobby plan)** | Free, auto-deploys on push to `main` via GitHub integration. Preview deployments per PR. |
| Database | **Supabase (Free tier)** — Postgres only | Free Postgres with a real relational schema (fits the checklist/log data model below). **Supabase Auth and Storage are deliberately not used** — see §4 for why auth is a custom token scheme instead, and §3/§6 for why attachments are links, not uploaded files (removes the need for Storage entirely). |
| Styling | Mockup's own CSS, ported as-is (`src/app/globals.css`), plus Tailwind installed for utility classes | The approved mockup's CSS is the actual design system (custom properties, component classes) — porting it verbatim guarantees pixel-fidelity with less effort than re-deriving it as Tailwind utilities. Tailwind is available for any new one-off layout needs but isn't the primary styling mechanism. |
| Repo | **GitHub** | Source of truth; connected directly to Vercel for CI/CD. |

### Known free-tier constraints to design around
- **Supabase free projects pause after 7 days with no API traffic.** Since real usage is weekly, a quiet long weekend could pause the project right before Monday's update. Mitigate with a scheduled **GitHub Actions** workflow (free on public repos, cheap on private) that pings a lightweight API route every few days to keep the project warm. Add this in `.github/workflows/keep-alive.yml` before go-live.
- **Supabase free tier**: 500 MB database, 1 GB file storage, 5 GB egress/month, 2 active projects max. Fine for this app's scale (9 projects × 5 teams × weekly text + occasional PDF attachments), but don't store large files (compress/limit attachment size at upload, e.g. 5–10 MB cap) and don't let this become a general document repository.
- **Vercel Hobby plan** is scoped to non-commercial/personal use and a single account seat (only one person manages the Vercel project/deploys). That's fine for an internal government tool with one deploy owner — just don't expect multiple people to have Vercel dashboard access on the free plan. If that's needed later, it's the first thing to upgrade (Vercel Pro), not the database.
- Both platforms' free tiers are usage-gated, not app-breaking — if this POC proves out and usage grows, the upgrade path is "pay for the specific service that's tight" (usually Supabase Pro, $25/mo), not a re-architecture.

## 3. Data model

Mirrors the entities already used in the mockup 1:1 — don't invent new shapes.

```
teams
  id            uuid pk
  name          text            -- e.g. "Tim Fasilitas Akomodasi"

categories              -- admin-manageable, not a hardcoded enum — see §6/§10
  code          text pk         -- short code shown in the chip, e.g. "A"
  label         text            -- e.g. "Pembangunan"
  color         text            -- hex, chip background — auto-assigned from a palette when created
  sort_order    int

projects
  id            uuid pk
  team_id       uuid fk -> teams.id
  category      text fk -> categories.code   -- default seed: A Pembangunan | B Renovasi Besar | C Renovasi | D Pembelian Lahan
  name          text
  target_label  text            -- e.g. "BAST-1", "Go-Live Operasional"
  status        text            -- 'ontrack' | 'behind' | 'alert' | 'notstarted' | 'done'
  plan_pct      numeric null    -- optional, for the rencana-vs-realisasi bar
  actual_pct    numeric null
  closed_at     timestamptz null -- explicit "done, no more weekly updates needed" flag — see §6, NOT inferred from actual_pct

checklist_phases
  id            uuid pk
  project_id    uuid fk -> projects.id
  label         text            -- e.g. "Pra Pembangunan & Pra Pengadaan"
  sort_order    int

checklist_items
  id             uuid pk
  phase_id       uuid fk -> checklist_phases.id
  name           text           -- 'RBT' | 'RPP' | 'RBTek' | 'KAK' | 'SPPP' | 'Kick Off' | 'BAST 1' | 'BAST 2' | ...
  due_label      text           -- free-text target shown to user, e.g. "30 Apr 2026"
  done           boolean default false
  status         text           -- fallback badge when not done: 'ontrack' | 'behind' | 'notstarted' | 'manual'
  doc_date       date null      -- required at the moment `done` is set true
  doc_number     text null
  vendor         text null      -- shown/asked mainly for KAK/SPPP-type items
  contract_value text null      -- free text, not numeric — values are written like "Rp1.506.985.000" or descriptive
  doc_link       text null      -- live link to the document (Drive/SharePoint/etc). No file upload — see §6.
  notes          text null
  updated_by     uuid null      -- fk -> access_tokens.id (the shared team code that made the change, not a person)
  updated_at     timestamptz

weekly_logs
  id            uuid pk
  project_id    uuid fk -> projects.id
  period_label  text            -- e.g. "Minggu 4 · Agustus 2026" — see §5 for how this is derived
  submitted_at  timestamptz
  submitted_by  uuid null       -- fk -> access_tokens.id
  status        text            -- status snapshot at time of entry (same enum as projects.status)
  progres       text[]          -- bullet points
  rencana       text[]          -- bullet points ("Rencana Tindak Lanjut"), can be empty
  link_url      text null       -- optional live link to a supporting document, not a file upload
  edited_at     timestamptz null -- set when a team edits a past entry; original submitted_at is preserved

access_tokens          -- the login mechanism itself; see §4
  id            uuid pk
  code_hash     text unique    -- sha256(code) — the plaintext code is shown once at creation, never stored
  role          text           -- always 'team' (the admin logs in with ADMIN_CODE from env, not a row here)
  team_id       uuid fk -> teams.id
  label         text           -- admin's own note, e.g. "dibagikan 3 Sep 2026"
  active        boolean default true
  created_at    timestamptz
  last_used_at  timestamptz null
```

Note: `projects.plan_pct` has no UI to set it (no "rencana vs realisasi" input was built — see §6/§10); it stays `null` unless an admin sets it directly in Supabase Table Editor. `actual_pct` is auto-computed and stored whenever a checklist item is toggled (done-count / total-count across the project, rounded).

Key rule carried over from the mockup: **`weekly_logs` is append-only from the UI's perspective.** "Simpan sebagai Update Baru" always inserts a new row. Editing a past entry updates that same row and stamps `edited_at` — it never deletes or silently overwrites history.

`projects.status` and `projects.*_pct` are denormalized snapshots kept in sync (via a DB trigger or just a mutation in the same request) whenever a checklist item is toggled or a new weekly log is saved, so dashboard queries stay simple (no join-and-aggregate on every page load).

## 4. Roles & access (POC-level, keep simple)

Two roles only:
- **Tim (team member)** — can only see/edit projects belonging to their team (`projects.team_id = current user's team`). Can add weekly log entries, edit their own past entries, and mark checklist items done/undone with detail.
- **Admin** — read-only across all teams/projects except for the explicit close/reopen action (§6, point 2) and managing access tokens/teams/projects/categories (§4/§6). Sees the belum-update KPIs and per-team breakdown, can open any project's drawer.

**Auth is a custom login-code scheme, not Supabase Auth** (deliberate deviation from the original plan, per explicit request): each team logs in with one shared code (e.g. `GPAN2-7F3K9Q`) instead of an email/password or magic link. The admin logs in with their own code, which they pick themselves and set as the `ADMIN_CODE` environment variable — it is never stored in the database. Team codes are generated *through the app* by the admin (Dashboard → **Kelola Kode Akses**): the plaintext code is shown once at creation and only its SHA-256 hash is stored (`access_tokens.code_hash`); the admin copies it and shares it with that team out-of-band (chat, in person). Codes can be revoked or regenerated from the same screen.

A successful login sets a signed, `httpOnly` session cookie (HMAC-SHA256 over `{role, teamId?, exp}`, see `src/lib/session.ts`) — there's no separate session table. The signing uses the Web Crypto API (`crypto.subtle`), not Node's `crypto` module, because `src/middleware.ts` runs on the Edge runtime and needs the same code path.

**Authorization is enforced in the Next.js API route handlers (`src/app/api/**`), not via Postgres Row Level Security.** Every route reads the session cookie, checks `role` and (for team routes) that the requested project's `team_id` matches the caller's `teamId`, and only then uses the Supabase **service-role** key to read/write — the service role bypasses RLS entirely. RLS is still enabled on every table with no policies (default-deny) as defense in depth against the service-role key ever leaking client-side, but it is not the access-control mechanism; don't add per-user RLS policies expecting them to do anything, since there's no Supabase-Auth `auth.uid()` to key them on. If this app ever moves to real per-person accounts, that's the point to revisit this whole section, not to bolt RLS onto the current scheme.

Do not build a public sign-up flow. Teams never register themselves — the admin issues every code.

## 5. Reporting period ("Minggu ke-N")

The mockup hardcodes `CURRENT_PERIOD`. In the real app, derive it instead of hardcoding:
- A period is "Minggu N · [Bulan] [Tahun]" where weeks reset at the start of each month (matches the source PDF's own convention: "Minggu ke-4 Agustus 2026").
- Compute it server-side from `now()` so "belum update minggu ini" is always evaluated against the real current period, not a stale constant.
- Deliverable checklist items are **not** tied to a period — they're milestone-based and can be marked done any time. Only `weekly_logs` rows carry a `period_label`.

## 6. Screens (built)

1. **`/update` (Tim role, default landing)** — compose-new-entry card + reverse-chronological log of past entries (each editable) on the left; checklist deliverable list with progress bar on the right, for whichever project is selected. Clicking a checklist item opens the detail modal (date required; doc number / vendor / contract value / **link dokumen** / notes optional; "Tandai Belum Selesai" to undo). **Project picker** (above the detail panel) is a card grid (`ProjectPickCard` in `UpdateClient.tsx`), not a row of small tabs — each card shows the category chip, name, a sudah/belum-update dot, and a mini checklist-progress bar. Two clickable stat tiles above the grid (**Sudah Update** / **Belum Update**, same click-to-filter pattern as the admin dashboard) filter which cards show; the grid itself is sorted belum-update-first.

   **"Tutup Proyek" / "Buka Kembali" is an explicit, reversible action** (`projects.closed_at`, toggled via `PATCH /api/projects/[id]/close`, button in the "Update Progres Mingguan" panel-head) — a closed project drops out of the main grid and the Sudah/Belum Update counts, replaced by a "Ditutup" tile that reveals them again on click. **This was deliberately changed away from an earlier version that auto-hid any project at 100% checklist completion** — that was wrong: a project can be 100% done on its checklist and still have something worth writing in a weekly update (operational notes, follow-ups), so completion has to be a deliberate call by the team (or admin — see point 2), never inferred from `actual_pct`. Don't reintroduce a percentage-based auto-hide here.
2. **`/dashboard` (Admin role, default landing)** — KPI row: Total Proyek, Rata-rata Progres, Behind/Alert (informational), and two **clickable** tiles, Sudah Update / Belum Update, that filter the project table below to that subset (click again to clear — see `updateFilter` state in `DashboardClient.tsx`). Replaced the old always-expanded "belum update" banner listing every project by name (2026-09-03) — that didn't scale and duplicated what the table + these tiles already show. Below that, a **per-team breakdown row** (`teamStats` in `DashboardClient.tsx`) — one clickable tile per team showing how many of *that team's* projects haven't updated this period (✓ if all caught up) — added 2026-09-03 because a single aggregate "Belum Update" number didn't tell the admin which team to chase; clicking a team tile sets both `teamFilter` and `updateFilter` on the table below. Category filter chips are built from the live `categories` list, not a hardcoded A–D. Row click opens a read-only drawer: plan-vs-actual bar (only rendered if `plan_pct` is set — see §3), checklist (view-only, still shows doc detail), full weekly log history (view-only), and — since 2026-09-03 — a **"Tutup Proyek"/"Buka Kembali" button** (same `closed_at` toggle as point 1, admin can act on any project, not just its own team's). All the KPI/team-breakdown/Sudah-Belum-Update numbers on this page are computed from *open* (non-closed) projects only — a closed project shouldn't count against a team's "belum update" tally. A **"Ditutup" tile** (only rendered when at least one project is closed) shows the closed count and toggles the table to show just those, with a "Ditutup" badge on each row.
3. **`/admin/tokens` ("Kelola Kode Akses", admin only)** — create a login code for a team, see all codes with their status/last-used, revoke or regenerate one. Not in the original mockup; added because of the token-auth scheme in §4.
4. **`/admin/projects` ("Kelola Proyek & Tim", admin only)** — add a new team, add a new project (assign team/category/name/target), and build that project's checklist structure (add/delete phases, add/delete deliverable items). Also where a team or project gets deleted (project delete cascades to its checklist and weekly-log history — client-side `confirm()` before calling it, no soft-delete). Added 2026-09-03 — see the non-goals note below for why this exists despite the original plan. Finding a project to manage is a **search combobox** (type to filter by name/team, pick from the dropdown), not a scrollable list of every project — changed 2026-09-03 once the project count made a flat list unwieldy; see `ProjectSection` in `AdminProjectsClient.tsx`.
5. **`/login`** — a single code input, no email field. Routes to `/update` or `/dashboard` based on what the code resolves to.
6. Both roles share the same checklist/log rendering components (`ChecklistPanel`, `LogList`) — not forked into two components; a `readOnly` flag controls whether rows are clickable / edit buttons show, same idea as the mockup's approach. `/admin/projects`' checklist *builder* (add/delete phase/item) is a separate, simpler component (`ChecklistBuilder` inside `AdminProjectsClient.tsx`) — it's a structural editor, not a rendering of the same read/toggle interaction, so it wasn't worth forcing into `ChecklistPanel`'s shape.

**Categories are admin-manageable data, not a fixed A/B/C/D enum** (changed 2026-09-03, also fixed D's label — it's "Pembelian Lahan", not "Penugasan", a mislabel from the first pass). Backed by the `categories` table (`supabase/migrations/0002_categories.sql`), served over `GET /api/categories` (any logged-in role) and extended via `POST /api/admin/categories` (admin only, label-only form — code and color are auto-assigned, see the route for the palette-rotation logic). Client components read categories through `useCategories()` (`src/lib/useCategories.ts`), which returns a `{code: CategoryDef}` lookup map (`byCode`) that `CatChip` needs to render — a chip with no matching category (data not loaded yet, or the migration hasn't been applied) falls back to a gray "?" rather than crashing. **Do not hardcode category codes/labels/colors anywhere again** — if you're tempted to write `A: "Pembangunan"` in a component, use `useCategories()` instead.

**Attachments are links everywhere, not file uploads** — both the checklist item's "Link Dokumen" field and the weekly log's optional link field are a plain URL text input (Google Drive / SharePoint / etc., pasted by the team), per explicit request. This is *also* why Supabase Storage isn't used at all (§2) — there was never a reason to add it. The mockup's file-upload UI (`attach-row`, drag-and-drop) was not ported; do not reintroduce it without a real reason to store files.

**Custom CRUD for projects/teams/checklist structure exists after all — this reverses what this file originally said.** The first build deliberately left this out in favor of editing rows directly in Supabase's Table Editor (§10 used to list it as a non-goal). The admin then hit this for real: the spreadsheet-seeded seed data doesn't match what's needed to demo the tool to teams, and asked for the feature back explicitly ("add feature to add new TIM and Proyek among with it Ceklist Item"). `/admin/projects` (point 4 above) is that feature. Supabase Table Editor is still fine to use directly for anything the UI doesn't cover (bulk edits, fixing a typo in a name, editing `plan_pct`), but don't assume project/team/checklist creation is out of scope for this app anymore — it isn't.

## 7. Design system

**The navy/gold institutional palette below is retired.** This section originally said "carry over exactly, don't reinterpret" — that stood for the first build, but on 2026-09-03 the admin explicitly asked for a full palette swap toward a softer blue/purple look (shown a reference image of a colorful gradient/glassmorphism "AI SaaS" landing page and picked "full palette swap" over a lighter "keep navy/gold, add polish" option when asked to clarify scope). The CSS custom-property *names* in `globals.css` (`--navy-950`, `--navy-900`, `--gold`, etc.) were kept as-is to avoid a mechanical rename touching every component — but their **values** now point at indigo/violet, not navy/gold. Read the variable values in `globals.css`, not the variable names, to know the actual current colors:
- `--navy-950` → `#1E1B4B` (deep indigo, sidebar gradient start), `--navy-900` → `#312E81`, `--navy-800` → `#4338CA`, `--navy-700` → `#4F46E5`, `--navy-100` → `#E0E7FF`.
- `--gold` → `#8B5CF6` (violet, now the accent color despite the variable name — was `#B8863B` gold), `--gold-soft` → `#EDE9FE`, plus a new `--gold-ink` (`#5B21B6`) for text on `--gold-soft` backgrounds (replaces old hardcoded browns like `#8C5F1E`/`#7A5116`/`#3B2A0E` — if you find one of those hex codes still hardcoded somewhere, that's a miss, fix it to use `--gold-ink`).
- New `--gradient-primary` (`linear-gradient(135deg, #4F46E5, #8B5CF6)`) — used on `.save-btn` and `.progress-bar-fill` in place of a flat navy/gold fill. Reach for this on new primary-action surfaces rather than a flat `var(--navy-900)`, to keep the gradient look consistent.
- `--paper` (page background) → `#F6F5FC`, a soft lavender tint instead of plain gray, and `--line`/`--ink*` shifted slightly violet-tinted too.
- `--radius-m` → `14px` (was `10px`) and `--shadow-card` is a softer, larger indigo-tinted shadow — part of the "rounder/softer card" look from the reference.
- Gradient surfaces beyond the variables: `.sidebar` (diagonal indigo→violet→indigo), `.login-wrap` background, `.save-btn`. (`.brand-mark` no longer has its own gradient — see the 2026-09-04 logo entry below, it's now an `<img>`.)
- **Status colors are unchanged on purpose** — green/red/amber/gray/teal for on-track/behind/alert/not-started/done still mean the same thing they always did. The palette swap was about institutional chrome (sidebar, buttons, accents), not swapping out functional status semantics; don't reinterpret "full palette swap" as license to recolor status badges.
- Category chip colors come from the `categories` table (see §6), including the palette a new category auto-picks from (`PALETTE` in `src/app/api/admin/categories/route.ts`) — that array was updated to blue/purple/teal/pink tones to match. Don't hardcode a code→color mapping in a component.
- Fonts unchanged: `Newsreader` (serif, headings/display numbers) + `IBM Plex Sans` (UI/body).
- Layout structure unchanged: left icon sidebar + sticky topbar + card-based content — the palette swap was colors/gradients/radius, not a layout rework.
- Sidebar brand text and the page `<title>` both read "PANTAU" / "Portal Antar Unit untuk Monitoring Terpadu" (changed 2026-09-03, was "DPAN Progress" / "GPAN2 · POPN2 & KPAN2") — see `AppShell.tsx`'s `.brand-text` and `layout.tsx`'s `metadata`. Keep them in sync if either changes again.
- **Keep every text `<input>`/`<textarea>` at `font-size: 16px` or larger.** Mobile Safari/Chrome auto-zoom the whole page on focus for any input under 16px, which looks like a UI bug ("the box expands") rather than a font-size issue — hit this on `.code-input` (was 15px) on the login page. Check this first if a form field looks like it's "jumping" or "expanding" on focus, especially one reported from a phone/tablet.
- **Every `all:unset;` rule in `globals.css` must be immediately followed by `box-sizing:border-box;`.** `all:unset` resets `box-sizing` to its initial value (`content-box`), and a class selector like `.save-btn` beats the global `*{box-sizing:border-box}` reset by specificity — so any of these reset-based button classes (`.save-btn`, `.ghost-btn`, `.logout-btn`, `.drawer-close`, `.modal-close`, `.btn-danger-text`, `.log-edit-btn`, `.add-bullet`, `.remove-bullet`) silently falls back to content-box. This is invisible until the element also gets `padding` and a `width` (e.g. `width:'100%'` inline on the login page's "Masuk" button, seen 2026-09-03) — then it renders *wider than its container* by exactly the padding amount, overflowing the card. If you add a new `all:unset` rule, add the box-sizing line with it.
- **Visual polish pass (2026-09-03, post-launch)**: after going live, the admin ran `/web-design` (a generic Jira/Linear-style "kanban dashboard" reference skill) and asked for its card/chip/spacing/shadow/color cues applied as a refinement, explicitly **not** a layout or functionality change (no kanban board was introduced — that stays a non-goal, see §10). What changed in `globals.css`: a new `--accent:#5B4FE9` token (nudges the interactive/focus color — hover borders, focus rings, text-link buttons like `.add-bullet`/`.log-edit-btn` — toward the reference's vivid indigo; `--gradient-primary` now starts from this same indigo); `--radius-m` `14px`→`16px` and a new `--radius-l:20px` for bigger surfaces (`.modal`, `.login-card`); a new `--shadow-card-hover` used on `.project-pick-card:hover` (softer lift + `translateY(-1px)`) so clickable cards get a hover state, per the skill's "don't skip hover states" guidance. This pass also **fixed two leftover hardcoded values missed during the original 2026-09-03 palette swap**: `.nav button.active`/`.nav a.active` was still using `rgba(184,134,59,...)` — the literal RGB of the retired `#B8863B` gold — recolored to a translucent indigo (`rgba(139,92,246,0.18)`) with a left accent bar (`border-left`), matching the skill's "translucent bg + left accent bar" active-nav pattern; `.form-input:focus`/`.code-input:focus` box-shadow was still `rgba(34,83,127,...)` (the old navy blue, pre-swap) — recolored to `rgba(91,79,233,...)` to match `--accent`. **If you see either of those old hex/rgb values reappear anywhere, that's the same class of miss — fix it, don't reintroduce it.** Status colors and category chip colors were untouched (same rule as the original swap — see above). Verified with `npm run build` (clean) and a local dev server hit (`/login` renders); no visual browser screenshot was taken this pass — if a rendering regression is reported, check there first.
- **Login background follow-up + real brand logo added (2026-09-04).** Two changes: (1) the admin reported the polish-pass login background ("i think the login page background still does not suit with the jira theme") was still the old bold, dark, saturated `#1E1B4B → #4338CA → #8B5CF6` diagonal gradient — swapped `.login-wrap` for a soft, light, low-saturation lavender→sky-blue background (two faint radial indigo/sky-blue glows over a light linear gradient), with `.login-card`'s shadow lightened to suit. (2) the admin then supplied an actual PANTAU brand mark (`assets/pantau_logo_concept.svg`/`.png` — a navy `#16233F` rounded-square badge with an amber `#F5A623` hub-and-spokes glyph, plus wordmark + tagline) and asked for it placed in the sidebar nav and on the login page, replacing the placeholder "BI" text badges. Two files were added under `public/` (Next.js static-asset root, created fresh — didn't exist before): `logo.svg` (the full horizontal lockup, copied as-is, used on `/login`) and `logo-icon.svg` (a hand-trimmed icon-only crop of just the badge — `AppShell.tsx`'s `.brand-mark` in the sidebar). `.brand-mark` in `globals.css` was changed from a circular gradient+"BI"-text badge to a plain `<img>` sizing rule (34×34px, no border-radius override — the badge's own rounded-square corners come from the SVG). `layout.tsx` also now sets `icons.icon` to `/logo-icon.svg` as the favicon. **This surfaced a real bug, not just styling**: `src/middleware.ts`'s matcher only excluded `api`, `_next/static`, `_next/image`, `favicon.ico` — any other path, including these new `/logo.svg`/`/logo-icon.svg` public files, got swept into the auth check and 307-redirected to `/login` for a logged-out visitor, which meant the logo would never actually load on the very page that needs it pre-login. Fixed by extending the matcher's negative-lookahead to also exclude common static file extensions (`.svg|.png|.jpg|.jpeg|.gif|.webp|.ico`). **If you add another file under `public/` and it doesn't render for a logged-out user, check this matcher first** — it's not scoped to "protect pages," it currently intercepts every non-excluded path including static assets. Deliberately did *not* re-theme the app's indigo/violet palette to the logo's navy/amber brand colors — the task was "arrange the logo," not "adopt the brand guideline's color system," and the indigo/violet swap was itself a separate explicit prior decision (see above); revisit only if asked. Verified with `npm run build` (clean) and a local `next start` hit confirming `/logo.svg`/`/logo-icon.svg` return 200 without a session cookie while page routes still redirect; no visual browser render was available to confirm final appearance (same tooling gap as the rest of this section).

## 8. Environment variables

```
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=   # server-side only, never exposed to client — the app never uses the anon key
SESSION_SECRET=              # random 64-char hex, signs the session cookie — see §4
ADMIN_CODE=                  # the admin's own login code, chosen by the admin, not generated
```
Set these in Vercel's project settings (Production + Preview) and in `.env.local` for local dev — never commit `.env.local`. There is no `NEXT_PUBLIC_SUPABASE_ANON_KEY` — the client never talks to Supabase directly, only through this app's own API routes (see §4), so the anon key isn't used anywhere.

**Known gotcha:** `NEXT_PUBLIC_SUPABASE_URL` must be exactly the Project URL and nothing else — `https://xxxx.supabase.co`, no trailing slash, no `/rest/v1` suffix. Hit this for real (2026-09-03): the value was set to `https://xxxx.supabase.co/rest/v1/` (copy-pasted from a curl example in the Supabase dashboard instead of the plain **Project URL** field under Project Settings → API), which made supabase-js build a doubled path (`/rest/v1/rest/v1/...`). Every query — in the app *and* in `scripts/seed.mjs`, which builds its own client — failed with `PGRST125 "Invalid path specified in request URL"`. Both `src/lib/supabase.ts` and `scripts/seed.mjs` now strip a trailing `/rest/v1` and trailing slashes defensively, but that's a safety net, not the fix — if `PGRST125` shows up again, go check the raw env var value first before trusting the normalization.

## 9. Commands

```bash
npm install
npm run dev       # local dev server
npm run build     # production build (what Vercel runs)
npm run lint
npm run seed       # one-time: parse sample_data.xlsx -> populate teams/projects/checklist (see scripts/seed.mjs)
```

Schema changes go through `supabase/migrations/*.sql`, run manually in the Supabase SQL Editor for now — there's no `supabase db push` wired up (no Supabase CLI project link set up for this POC), and no direct Postgres connection available to run these programmatically (only the service-role API key, which is REST-only via PostgREST — it can't run DDL). **As of 2026-09-03 there are three migrations to apply in order**: `0001_init.sql`, `0002_categories.sql`, `0003_project_closed.sql`. If a query error mentions a missing column/table (`public.categories`, `projects.closed_at`, etc.), that's not a bug to fix in code — it's a reminder one of these hasn't been run yet.

## 10. Explicit non-goals for this POC

- No PowerPoint/slide auto-export yet (nice-to-have later, since the weekly narrative structure already mirrors the Rakor Mingguan slide format 1:1).
- No Gantt/timeline visualization beyond the simple plan-vs-actual bar in the drawer — the sidebar's "Timeline (Gantt)" nav item was a mockup placeholder and wasn't built at all here (no nav entry for it).
- No file upload/storage of any kind — attachments are pasted links only, see §6.
- No public self-serve sign-up — codes are provisioned manually by the admin through `/admin/tokens`.
- No draft/submitted distinction on weekly logs — every save is immediately visible to the supervisor.
- No reordering/renaming of checklist phases or items, and no editing a project's name/category/target after creation, from the UI — `/admin/projects` only covers add + delete for teams/projects/phases/items (see §6). Anything beyond that is still a Supabase Table Editor job.
- No per-person accounts within a team — one shared login code per team, not one per team member. `weekly_logs.submitted_by` / `checklist_items.updated_by` identify *which team's code* made a change, not which individual.

## 11. Reference

- UX/interaction spec: `example_design.html` (the interactive prototype already reviewed and approved by the supervisor — build against it, ask before deviating).
- Source data for realistic seed content: `manual_fact_rtpp.xlsx` (checklist structure) and the Rakor Mingguan PDF (narrative tone/structure) — both used to seed the mockup's sample data and can be reused to seed the real database for demo purposes.
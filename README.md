# Run

A single-user, local-first web app that **executes a fixed longevity plan**. Not a coach, not a
tracker, not a medical app — a deterministic engine with one screen on top.

The product test for every decision: *does this reduce friction, or add tracking burden?* If it adds
burden, it's cut.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # engine + storage unit tests (Vitest)
npm run build    # type-check + production build
```

No backend, no accounts, no network calls. All data lives in `localStorage` behind
`src/state/storage.ts`. Back up via **Settings → Export JSON**.

## Architecture — the four layers

The whole app is one loop: logging updates **State** → the **Engine** recomputes → tomorrow's
**Today** reflects it.

1. **Reference** (`src/engine/reference.ts`) — fixed plan content. Read-only, never recomputed.
2. **State** (`src/types.ts`, `src/state/seed.ts`) — current loads, sessions-since-deload, cardio
   phase, recovery trends, last-deload date.
3. **Engine** (`src/engine/*`) — pure functions. **Zero React, zero storage imports.** Takes state +
   inputs, returns prescriptions/decisions. This is the product; it is unit-tested.
4. **UI** (`src/screens/*`, `src/components/*`) — thin. Renders the engine's output, collects a tiny
   amount of input.

### Engine map

| File | Spec | What it does |
|---|---|---|
| `selectToday.ts` | §3.1 | State + today's recovery → directive + per-exercise loads |
| `progression.ts` | §3.2 | `nextLoad` — strength progression, pain/grindy/breakdown rules |
| `deload.ts` | §3.3 | trigger check (18-session backstop, stalls, recovery streak), 7-day entry/exit |
| `cardio.ts` | §3.4 | Zone 2 / interval ramp by phase, phase progression |
| `diet.ts` | §3.5 | green/yellow/red score |
| `governors.ts` | §4 | Achilles / back / sleep governors + **precedence resolver** (max severity) |
| `resumption.ts` | §4.5–4.6 | comeback loads by gap; Achilles graduation gate for impact work |
| `transitions.ts` | — | pure `applyWorkout` / `applyDailyLog` / `rebuildTrends` |
| `weekly.ts` | §5.2 | the single weekly recommendation |

## Screens

**Today · Week · Plan · Log · Settings.** Today is the home screen and is kept to one screenful of
decisions (recovery card → resolved directive → session → diet → steps/sleep). Week is the dashboard
(metrics + exactly one recommendation). Plan is read-only reference. Log is editable history.
Settings holds schedule, lifts, reminders, and JSON export/import/reset.

## Hard boundaries

- **Deterministic.** Same inputs → same prescription. No randomness, no re-planning.
- **Medical guardrail (§7).** The app reminds and references; it never decides, interprets, or
  diagnoses, and never touches a medication. The `diffuseSoreness` input is wired *only* to a
  reminder and can never change a prescription — `src/engine/__tests__/medical.test.ts` asserts this.
- **Governor precedence (§4.1).** When governors conflict, the day's directive is the *most
  conservative* level any governor returns. Tested.

## Seed

The app boots **in a deload week** (the user is mid-fatigue with stalled lifts), so the first thing
it prescribes is the deload. After 7 calendar days it resumes at the working loads in
`src/state/seed.ts`.

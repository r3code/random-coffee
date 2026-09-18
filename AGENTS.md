# AGENTS.md — Guidelines for AI coding agents

> Practical guide for any AI coding agent working on this repository.
> Follow this document first; details are in `docs/`.

## TL;DR

- **Stack (non-negotiable):** Vue 3 (Composition API, `<script setup>`), Vite 5, Tailwind **v3.x** (not v4!), Vue Router 4, `vite-plugin-pwa`, Vitest, `localStorage` only.
- **Run:** `npm install`, `npm run dev`, `npm test`, `npm run build`.
- **Before coding:** read `docs/SPEC.md` (relevant section) + `CHANGELOG.md`.
- **After coding:** `npm test` (92+ passing), `npm run build` (no warnings).
- **Bump version + CHANGELOG** for any user-visible change (semver, keep-a-changelog, Russian).

## Project overview

**Random Coffee Cards** — offline PWA for structured two-person dialogues.
Two participants on separate devices see the same question sequence (synced by
choosing the same "order" letter A..J). Roles alternate after each question.
All data in `localStorage`. No backend. No network sync.

- Live: <https://r3code.github.io/random-coffee/>
- Spec: [`docs/SPEC.md`](docs/SPEC.md) — full technical specification (1700+ lines)
- Changelog: [`CHANGELOG.md`](CHANGELOG.md) — version history, Russian, Keep a Changelog
- README: [`README.md`](README.md) — setup, deploy, dev commands

## Project structure

```
random-coffee/
├── .github/workflows/      # ci.yml, deploy-pages.yml
├── docs/SPEC.md            # ← full technical specification
├── public/                 # PWA icons, favicon (PNG via sharp)
├── src/
│   ├── components/InstallPrompt.vue   # "Install app" prompt (beforeinstallprompt + iOS)
│   ├── composables/useDeck.js        # singleton state, sessions, actions
│   ├── data/decks.js                 # 2 decks × 10 orders A..J, deterministic PRNG
│   ├── router/index.js               # nav guard: /game requires active session
│   ├── views/SetupView.vue           # main + new session form + history
│   ├── views/GameView.vue            # reader/answerer logic, cards, footer nav
│   ├── App.vue                       # <router-view/> + InstallPrompt + SW banners
│   ├── main.js
│   └── style.css                     # Tailwind base + safe-area + reduced-motion
├── tests/useDeck.test.js   # 92 Vitest tests
├── CHANGELOG.md            # ← update for every user-visible change
├── AGENTS.md               # this file
├── README.md
└── vite.config.js          # auto-detect base, VitePWA, workbox runtimeCaching
```

## 6 things you must NOT break

These are load-bearing invariants. Re-read the relevant section of `docs/SPEC.md` before touching.

1. **Singleton `useDeck`** — refs are module-level. All components share state. (§2.1, §5)
2. **Sessions history** — `coffee_sessions` array + `coffee_active_session_id`. Max 20 sessions (prune by `updatedAt`, protect active + just-added). (§2.2, §5.4)
3. **Role alternation** — `amIReading` = `currentTurn % 2 === 0` XOR role. Skip = +2 (skip entire round). `maxReachedTurn` tracks furthest turn. (§2.4, §2.6)
4. **Share-link inversion** — `buildShareUrl` swaps reader↔listener (link is for the partner). Optional `&turn=N` for mid-session sync. (§5.5, §6.2)
5. **`isLoading` flag** — prevents `watch(flush: 'sync')` from writing garbage during multi-ref updates in `loadSession` / `startSession` / `resetProgress`. Never remove. (§5.4)
6. **PWA `registerType: 'prompt'` + `NetworkFirst` for HTML** — no auto-reload mid-session. UI banner asks user to update. (§10.2, §10.3)

## Workflow for any code change

1. **Read first.** `docs/SPEC.md` relevant section + `CHANGELOG.md` for current state.
2. **Code.** Composition API + `<script setup>` only. Tailwind v3 classes. No Options API, no backend.
3. **Test:** `npm test` — must pass 92+. Add tests for new features.
4. **Build:** `npm run build` — no warnings. Check `dist/sw.js` exists.
5. **Bump version** in `package.json` (semver): PATCH=bugfix, MINOR=feature, MAJOR=breaking.
6. **CHANGELOG entry** under new version + date, groups: `### Добавлено / Изменено / Исправлено / Удалено`. Russian.
7. **Commit** with `feat:` / `fix:` / `chore:` / `docs:` prefix.

## Stack & versions (strict)

| Tool | Version | Notes |
|------|---------|-------|
| Vue | ^3.5 | Composition API + `<script setup>` only |
| Vite | ^5.4 | ESM. PWA via `vite-plugin-pwa` |
| Tailwind CSS | **^3.4 (NOT v4)** | `tailwind.config.js` + `postcss.config.js`. v4 breaks our setup |
| Vue Router | ^4.6 | `createWebHistory(import.meta.env.BASE_URL)` |
| vite-plugin-pwa | ^0.20 | `registerType: 'prompt'`, `workbox.runtimeCaching` |
| Vitest | ^2.1 | `environment: 'jsdom'`, `globals: true` |
| qrcode | ^1.5 | Generate share-link QR as `data:` URL |

## Testing

- **92 tests** in `tests/useDeck.test.js`. Run `npm test` before commit.
- Pattern: `vi.resetModules()` + dynamic `import('@/composables/useDeck?session=...')` for fresh singleton per test.
- For `URL.createObjectURL` (export), mock it:
  ```js
  global.URL.createObjectURL = vi.fn(() => 'blob:mock')
  global.URL.revokeObjectURL = vi.fn()
  ```
- Don't lower coverage. New feature → new test.

## PWA specifics (read before touching `vite.config.js`)

- `base` auto-detects from `GITHUB_REPOSITORY` (CI) or `REPO_NAME` (manual). Don't hardcode.
- `__APP_VERSION__`, `__COMMIT_HASH__`, `__COMMIT_DATE__` injected via `define` from `package.json` + `git rev-parse` / `git show`. Fallback to empty if no git.
- `workbox.runtimeCaching`: HTML = `NetworkFirst` 3s timeout / 5 entries / 7 days; assets = `StaleWhileRevalidate` / 60 entries / 30 days.
- **Never** switch to `autoUpdate` — reloads tab mid-session (catastrophic for dialogue app).
- Details: `docs/SPEC.md` §10.

## UI conventions

- **Russian only.** All UI text in Russian.
- **"Ты" form, not "вы".** "Прочитай", "нажми", "ответь".
- **Mobile-first.** Card history: two rows on narrow screens (name+date above, buttons below). Verify on iPhone 14 viewport.
- **Icons:** ✕ delete, ↓ export, ↻ restart. Avoid emoji for action buttons (🗑️, ⬇️ look childish). Status ✅/▶️ OK.
- **`title`** on icon-only buttons for hover tooltips. **`aria-label`** for screen readers.
- Details: `docs/SPEC.md` §7 (SetupView), §8 (GameView), §13 (a11y).

## Git conventions

- Commit prefix: `feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`.
- Don't commit `node_modules/`, `dist/`, `.git/` (in `.gitignore`).
- CI runs on push/PR via `.github/workflows/ci.yml`. Pages deploy on push to `main`.
- `fetch-depth: 0` in checkout (for `git show` in `vite.config.js`).

## Where to look

| Topic | Doc | Section |
|-------|-----|---------|
| Architecture, state | `docs/SPEC.md` | §2 |
| Config | `docs/SPEC.md` | §3 |
| Data (decks, PRNG) | `docs/SPEC.md` | §4 |
| `useDeck.js` API | `docs/SPEC.md` | §5 |
| Router / SetupView / GameView | `docs/SPEC.md` | §6–§8 |
| PWA, cache, install | `docs/SPEC.md` | §10 |
| CI/CD / Testing / a11y / Acceptance | `docs/SPEC.md` | §11–§14 |
| Version history | `CHANGELOG.md` | — |

## Commands

```bash
npm install                 # install deps
npm run dev                 # http://localhost:5173
npm test                    # 92 tests, once
npm run build               # production build (uses git for commit hash)
npm run preview             # serve dist/ on port 4173
GITHUB_REPOSITORY="r3code/random-coffee" npm run build   # simulate CI base
REPO_NAME=my-fork npm run build                          # manual base override
```

## If stuck

- **`URL.createObjectURL is not a function`** in jsdom — mock it (see Testing above).
- **`vite` / `vitest` not found** — run `npm install` (we don't commit `node_modules`).
- **Old version in browser after deploy** — `NetworkFirst` pulls fresh on next visit; click "Обновить" in banner. Hard reload: Ctrl+Shift+R.
- **404 on GitHub Pages** — `base` must match repo name (`/random-coffee/`). Auto-detect handles it; override with `REPO_NAME=...` if not.
- **PWA install prompt doesn't show** — `beforeinstallprompt` needs Chrome/Edge (not Firefox/Safari). iOS shows text instruction only.

---

End. For details, always read `docs/SPEC.md` and `CHANGELOG.md` first.


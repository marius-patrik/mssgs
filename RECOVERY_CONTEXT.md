# mssgs — Session Recovery Context

> Recovered from broken session `bd9bf51a-758c-415d-9a9d-e4f9b0d71357` on 2026-06-26.
> Original goal: build a public-release-ready VS Code extension for Beeper-like unified messaging.

## Original Requirements

- **Product:** VS Code extension called `mssgs` — a Beeper-like unified messenger inside VS Code.
- **Services to bridge:** iMessage, Telegram, WhatsApp, Instagram, etc. via official Matrix bridges.
- **Quality bar:** public-release-ready, no stubs, no MVPs, no slop.
- **Workflow:** spec-driven development, GitHub issues per spec, git worktrees per spec, PR branches per spec, clean commits, Biome linting, Husky hooks.
- **Tech stack:** npm workspace, TypeScript, VS Code extension host, React 19, Rsbuild, Tailwind CSS, Radix UI, Framer Motion, Lucide, Zustand + Immer, Zod, dagre, better-sqlite3, matrix-js-sdk, Vitest.
- **Repo:** `https://github.com/marius-patrik/mssgs.git`
- **Local clone:** `/Users/user/Projects/mssgs`
- **GitHub issues:** 13 open spec issues (`SPEC-01` through `SPEC-13`).

## Repository Layout

```text
/Users/user/Projects/mssgs
├── packages/extension/     # VS Code extension host (Node/TS)
├── packages/webview/       # React UI (Rsbuild)
├── .worktrees/spec-NN-slug # one worktree per spec branch
├── AGENTS.md               # project conventions
├── biome.json
├── package.json            # npm workspace root
```

## Spec Status

| Spec | Branch / Worktree | State | Notes |
|------|-------------------|-------|-------|
| SPEC-01 | `main` | ✅ Scaffold complete | Initial workspace, Biome, Husky, CI skeleton. |
| SPEC-02 | `spec/02-extension-host` | ✅ Complete, 4 commits ahead of main | Extension host skeleton: activation, 6 commands, webview view + panel, typed message bus, `WebviewManager`, tests. **Ready to merge.** |
| SPEC-03 | `spec/03-webview-shell` | 🚧 WIP, uncommitted | Webview shell: two-pane layout, Radix components, theme hook, motion components, 8 tests. **Uncommitted changes present.** |
| SPEC-04 | `spec/04-data-model` | ✅ Complete, 2 commits ahead of main | Zod schemas, Zustand + Immer store, in-memory sync layer, 33 tests. **Ready to merge.** |
| SPEC-05 | `spec/05-sqlite-cache` | ⏳ Empty scaffold | Local SQLite cache & persistence. |
| SPEC-06 | `spec/06-inbox-ui` | ⏳ Empty scaffold | Unified inbox UI. |
| SPEC-07 | `spec/07-thread-composer` | ⏳ Empty scaffold | Thread view & message composer. |
| SPEC-08 | `spec/08-backend-connections` | ⏳ Empty scaffold | Backend connections / Matrix bridges. |
| SPEC-09 | `spec/09-service-detection` | ⏳ Empty scaffold | Service detection & theming. |
| SPEC-10 | `spec/10-account-wizard` | ⏳ Empty scaffold | Account setup wizard. |
| SPEC-11 | `spec/11-beeper-extras` | ⏳ Empty scaffold | Beeper extras. |
| SPEC-12 | `spec/12-tests-cicd` | ⏳ Empty scaffold | Tests & CI/CD hardening. |
| SPEC-13 | `spec/13-docs-release` | ⏳ Empty scaffold | Docs & release. |

## Git State

- Local clone: `/Users/user/Projects/mssgs`
- Main branch: `54acfc1 chore: fix biome formatting and non-null assertion`
- Pushed branches: `main`, `spec/02-extension-host`, `spec/04-data-model`
- Unpushed branches: `spec/03-webview-shell` (WIP, uncommitted), `spec/05` through `spec/13`
- Worktrees: all 13 spec branches have worktrees under `.worktrees/spec-NN-slug/`
- No open PRs.

## SPEC-02 Details (Complete)

Worktree: `/Users/user/Projects/mssgs/.worktrees/spec-02-extension-host`
Branch: `spec/02-extension-host`

Implemented:
- `packages/extension/src/extension.ts` — activation, command/webview registration.
- `packages/extension/src/webview/WebviewManager.ts` — panel/view lifecycle, asset loading, CSP nonce, theme forwarding.
- `packages/extension/src/webview/MessengerViewProvider.ts` — activity-bar webview provider.
- `packages/extension/src/shared/messages.ts` — typed request/response/event bus.
- `packages/extension/src/commands/index.ts` — `mssgs.openMessenger`, `mssgs.addAccount`, `mssgs.signOut`, `mssgs.markAllAsRead`, `mssgs.archiveConversation`, `mssgs.searchMessages`.
- `packages/extension/src/__mocks__/vscode.ts` + `packages/extension/src/__tests__/extension.test.ts` — 7 tests.
- `packages/extension/vitest.config.ts`, `packages/webview/vitest.config.ts`.
- `biome.json` ignores `dist/` and `out/`.

Status: `npm run typecheck`, `npm run test`, `npm run lint` all pass.

## SPEC-03 Details (WIP, Uncommitted)

Worktree: `/Users/user/Projects/mssgs/.worktrees/spec-03-webview-shell`
Branch: `spec/03-webview-shell`

Uncommitted changes:
- `packages/webview/package.json` — added `@radix-ui/react-avatar`, `@radix-ui/react-tooltip`, `tailwindcss-animate`, testing-library deps, `jsdom`.
- `packages/webview/src/App.tsx` — two-pane messenger layout (sidebar conversation list + empty main area).
- `packages/webview/src/index.css` — design tokens.
- `packages/webview/tailwind.config.js` — shadcn/ui color tokens + theme config.
- `packages/webview/tsconfig.json` — adjusted.
- New files:
  - `packages/webview/src/styles/tokens.css`
  - `packages/webview/src/hooks/useTheme.ts`
  - `packages/webview/src/lib/utils.ts`
  - `packages/webview/src/components/ui/*` (button, input, scroll-area, tooltip, avatar, dialog, dropdown-menu)
  - `packages/webview/src/components/motion/*` (Fade, Slide, MessageBubbleMotion)
  - `packages/webview/src/__tests__/App.test.tsx`, `useTheme.test.ts`, `utils.test.ts`
  - `packages/webview/vitest.config.ts`, `packages/webview/vitest.setup.ts`

Known issue: after `npm run build`, Biome scans generated `dist/` files. This worktree needs the same `dist`/`out` ignores that SPEC-02 and SPEC-04 added.

Status: extension tests may fail because there are no extension tests in this worktree; webview tests pass. Lint may fail due to `dist/` scanning.

## SPEC-04 Details (Complete)

Worktree: `/Users/user/Projects/mssgs/.worktrees/spec-04-data-model`
Branch: `spec/04-data-model`

Implemented:
- `packages/extension/src/shared/schemas.ts` — Zod schemas for `Account`, `Contact`, `Conversation`, `Message`, `Reaction`, `Attachment`, `NormalizedState`.
- `packages/extension/src/shared/types.ts` — inferred TypeScript types.
- `packages/webview/src/stores/messengerStore.ts` — Zustand + Immer normalized store with actions.
- `packages/webview/src/stores/syncLayer.ts` — `InMemorySyncLayer`.
- 18 schema tests + 15 store/sync tests = 33 tests.
- `packages/webview/tsconfig.json` `rootDir` adjusted to `../..` so webview can import shared schemas from `packages/extension/src/shared`.

Status: `npm run typecheck`, `npm run test`, `npm run lint` all pass.

## Next Recommended Steps

1. **Decide merge strategy:** SPEC-02 and SPEC-04 are complete and can be merged to `main`.
2. **Finish SPEC-03:** commit/stash current WIP, add Biome ignores for `dist/`/`out/`, complete webview shell, wire it to the message bus from SPEC-02 and the store from SPEC-04.
3. **Continue with SPEC-05+** in order: SQLite cache, inbox UI, thread/composer, backend connections, etc.

## Useful Commands

```bash
cd /Users/user/Projects/mssgs

# Run checks in a worktree
cd .worktrees/spec-02-extension-host
npm run lint
npm run typecheck
npm run test

# Commit finished spec and push
git checkout spec/02-extension-host
git push -u origin spec/02-extension-host
# open PR via GitHub

# Merge to main after review
git checkout main
git merge spec/02-extension-host
```

## Conversation Notes

- User emphasized not to over-question and to trust their direction.
- User wanted Matrix bridges researched and used.
- User wanted GitHub issues used for every spec, branches/PRs per spec.
- User wanted public-release quality — no stubs, no MVPs.
- User confirmed Biome for linting.
- User provided GitHub token for agents to use (stored under `.agents`).

## Recoverable Assets

- All source code is on disk in the worktrees.
- SPEC-02 and SPEC-04 are committed and pushed.
- SPEC-03 WIP is uncommitted but intact.
- GitHub issues exist for all 13 specs.
- The main agent conversation transcript is lost beyond the last few events; this document replaces that context.

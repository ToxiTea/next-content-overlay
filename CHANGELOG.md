# Changelog

All notable changes to `next-content-overlay` are documented here.
This project follows [Semantic Versioning](https://semver.org/).

## 1.0.0 — Plug-and-play inline CMS

v1.0 is a major upgrade: the CLI that shipped in v0.1 is now the **secondary**
interface. The primary experience is a drop-in React + server bundle that gives
any Next.js App Router project click-to-edit inline editing in three files —
still file-backed, still MIT, still no database.

### Added

- **`<Editable>` component** — wrap any text in a React component with a stable key
  (`<Editable k="hero.title" as="h1">Welcome</Editable>`). In edit mode it becomes a
  click-to-edit field with an auto-resizing textarea, Ctrl+B bold toggle, newline
  preservation, and optional delete support.
- **`<ContentOverlayProvider>`** — context provider that manages edit mode state,
  admin gating, pending change tracking, and publish coordination. Accepts
  `initialContent` for zero-flash SSR hydration.
- **`<EditModeToggle>`** — floating corner button with edit-mode indicator,
  pending count badge, and one-click publish.
- **`createContentAPI({ isAdmin? })`** — server factory that returns a single
  catch-all route handler. Mount once at `app/api/content-overlay/[...action]/route.ts`
  and get seven endpoints: `me`, `content`, `save`, `publish`, `history`, `restore`, `login`.
- **`getContent()`** — server helper that reads `content/site.json` for SSR so your
  server components can pass the published map into the provider.
- **Version history + restore** — every draft save is logged to
  `.overlay-content/history.json`. The Editable component has a History panel that
  lists prior versions and can restore them as a new draft.
- **Draft/publish workflow** — saving creates a draft, publishing atomically copies
  all drafts into `content/site.json`. The toggle button shows both pending edits
  and unpublished drafts so the flow is visible.
- **Layered admin auth** — works with no config in development. Set
  `CONTENT_OVERLAY_SECRET` to enable a shared-secret modal login in production,
  or pass a custom `isAdmin(request)` callback to wire into your own auth.
- **`content-overlay setup` command** — scaffolds the API route file and prints
  next-step snippets for layout + pages.

### Changed

- **Package exports** — `.` now resolves to the React bundle; server utilities
  live at `next-content-overlay/server`; the CLI still ships via the
  `content-overlay` bin.
- **Draft file format** — `.overlay-content/draft.json` is now a map of
  `DraftEntry` objects (`{ value, version, updatedAt }`) instead of flat strings,
  so history and versioning work end-to-end. **v0.1 flat drafts auto-migrate on
  first read**, and the original file is backed up to
  `.overlay-content/draft.v0.backup.json`.
- **CLI commands** — `edit` and `publish` now use the same `ContentStorage` class
  the visual editor uses, so the two interfaces share storage and stay in sync.

### Migrating from 0.1

1. `npm install next-content-overlay@latest`
2. Your existing `content/site.json` is untouched and keeps working.
3. Existing `.overlay-content/draft.json` is auto-migrated on first v1.0 read
   (flat strings → `DraftEntry` objects). A backup is saved next to it.
4. To adopt the visual editor: run `content-overlay setup`, wrap your root layout
   in `<ContentOverlayProvider>`, and replace static text with `<Editable>`.
5. CLI-only workflows (`init` / `scan` / `edit` / `publish`) keep working exactly
   as they did in v0.1.

## 0.1.0 — Initial release

- `content-overlay` CLI with `init`, `scan`, `edit`, `publish` commands.
- File-backed content store at `content/site.json` with draft workflow in
  `.overlay-content/draft.json`.
- Stable content-key generation via AST scan of `app/` and `components/`.

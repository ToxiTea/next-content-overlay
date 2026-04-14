# next-content-overlay

**Plug-and-play inline CMS for Next.js — click text on the page, edit it, publish. No database.**

`next-content-overlay` gives any Next.js App Router project a Squarespace-style inline editor in three files. Your content lives in a plain JSON file in your repo (by default — v1.1 lets you plug in any backend). Version control handles history. There is no CMS platform, no vendor lock-in, no config hell.

It started as a CLI-only tool in v0.1 (`init → scan → edit → publish`). As of **v1.0** the primary interface is a React component + server bundle that you drop into a layout — and the CLI is still there as a secondary workflow when you'd rather edit copy from the terminal.

> **From v0.1 → v1.0:** the CLI still ships and still works. The big upgrade is that you can now edit text visually, on the page, with drafts and version history, without leaving the browser. See [CHANGELOG.md](CHANGELOG.md) for the full migration guide.

## What it is

`next-content-overlay` is a tiny add-on for Next.js websites that lets you click on text right on your live page and edit it — no code changes, no CMS dashboard, no redeploys. Edits save to a local **draft**, and when you hit **publish**, they become the real content your site serves.

It's about as plug-and-play as it gets for a dev tool: it lives inside your own project (not a hosted service), ships as a single npm package, and has no database by default — your repo *is* the database.

## How to work it

1. **Install it** in your Next.js App Router project: `npm i -D next-content-overlay`.
2. **Set up the API route** in one command: `npx content-overlay setup`. This scaffolds the catch-all route at `app/api/content-overlay/[...action]/route.ts` so saves and publishes have somewhere to go.
3. **Wrap your root layout** in `<ContentOverlayProvider>` and add `<EditModeToggle />` — the little floating edit button.
4. **Tag editable text** by swapping plain strings for `<Editable k="some.key">Your text</Editable>`. You can do this by hand, or run `npx content-overlay scan` to auto-discover strings in your JSX and generate stable keys for you.
5. **Run your site** with `npm run dev`, press `Ctrl+Shift+E`, click any tagged text, type the new version, hit save. When you're happy, click **Publish Drafts**.

That's the full loop. No schemas, no migrations, no admin panel to build.

## The flow, under the hood

Here's what actually happens when you click → edit → save → publish:

- **Click an `<Editable>` in edit mode** → it becomes an inline textarea. You're editing the DOM; nothing has been written yet.
- **Hit save** → the new value is POSTed to `/api/content-overlay/save`, which writes a versioned **draft** entry to `.overlay-content/draft.json` (or your custom storage backend). Your published content is untouched. A history entry is logged.
- **Hit Publish Drafts** → all pending drafts get promoted into `content/site.json` (the file your app actually reads at build/request time) in a single atomic write. Another history entry is logged, and Next.js paths can be revalidated.
- **Refresh the page** → your SSR call to `getContent()` picks up the new JSON, and the new text renders exactly like any other content in your app.

Every save is versioned, so you get a per-key history panel in the editor with one-click restore — like git, but for individual strings.

## Where your edits live

By default, **content lives as JSON files in your repo.** That's the whole "no database" pitch:

- `content/site.json` — your **published** content, committed to git. This is what your app reads.
- `.overlay-content/draft.json` — in-progress drafts (per-key versioned). Not typically committed.
- `.overlay-content/history.json` — per-key version history, for restore.

This works great for local development and solo workflows: edit on `localhost:3000`, publish, then `git commit && git push`. Your git history doubles as your CMS audit log.

**For production / team editing** (where non-technical teammates edit the live site and expect changes to stick), the filesystem on most hosts is ephemeral, so the default backend won't persist across deploys. That's what the [pluggable storage](#pluggable-storage-v11) seam added in v1.1 is for — drop in a `StorageAdapter` backed by your own database (Postgres, Supabase, Redis, GitHub API, whatever) and the exact same editor UI now writes there instead.

## Install

```bash
npm i -D next-content-overlay
```

## Quickstart (visual editor — 3 files)

### 1. Wrap your root layout

```tsx
// app/layout.tsx
import { ContentOverlayProvider, EditModeToggle } from "next-content-overlay";
import { getContent } from "next-content-overlay/server";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const content = await getContent();
  return (
    <html>
      <body>
        <ContentOverlayProvider initialContent={content}>
          {children}
          <EditModeToggle />
        </ContentOverlayProvider>
      </body>
    </html>
  );
}
```

### 2. Wrap any text in `<Editable>`

```tsx
// app/page.tsx
import { Editable } from "next-content-overlay";

export default function Page() {
  return (
    <main>
      <Editable k="hero.title" as="h1">Welcome to my site</Editable>
      <Editable k="hero.subtitle" as="p" multiline>
        Build something amazing with zero config.
      </Editable>
    </main>
  );
}
```

### 3. Mount the API handler

```ts
// app/api/content-overlay/[...action]/route.ts
import { createContentAPI } from "next-content-overlay/server";

const handler = createContentAPI();
export const GET = handler;
export const POST = handler;
```

Or scaffold it with one command:

```bash
npx content-overlay setup
```

**That's it.** Press `Ctrl+Shift+E`, click any `<Editable>` text, edit it, save. Click **Publish Drafts** when you're ready to ship.

## How it works

```
┌───────────────────────┐      ┌──────────────────────┐      ┌──────────────────────────┐
│ <Editable> component  │ ───▶ │ createContentAPI()   │ ───▶ │ content/site.json        │
│ (click-to-edit UI)    │      │ (Next.js route)      │      │ .overlay-content/*.json  │
└───────────────────────┘      └──────────────────────┘      └──────────────────────────┘
```

- **`content/site.json`** — your published content, committed to git.
- **`.overlay-content/draft.json`** — working drafts (per-key versioned).
- **`.overlay-content/history.json`** — per-key version history for restore.

All JSON. All in your repo. No database, no external service.

## Components API

### `<ContentOverlayProvider>`

| Prop             | Type                          | Default                   | Description |
|------------------|-------------------------------|---------------------------|-------------|
| `initialContent` | `Record<string, string>`      | `{}`                      | Published content map from `getContent()` for SSR hydration. |
| `basePath`       | `string`                      | `"/api/content-overlay"`  | Mount path for the API route. |
| `shortcut`       | `string`                      | `"ctrl+shift+e"`          | Keyboard shortcut to toggle edit mode. |

### `<Editable>`

| Prop        | Type                 | Default     | Description |
|-------------|----------------------|-------------|-------------|
| `k`         | `string`             | *(required)* | Stable content key (e.g. `"hero.title"`). |
| `as`        | `keyof JSX.IntrinsicElements` | `"span"` | Element to render in view mode. |
| `children`  | `ReactNode`          | —           | Default text used until a published value exists. |
| `multiline` | `boolean`            | `false`     | Allow newlines; uses textarea instead of single-line input. |
| `maxLength` | `number`             | `5000`      | Soft character limit. |
| `deletable` | `boolean`            | `false`     | Show a Delete button in the editor. |
| `className` | `string`             | —           | Passed through to the rendered element. |

### `<EditModeToggle>`

| Prop       | Type                                             | Default         |
|------------|--------------------------------------------------|-----------------|
| `position` | `"bottom-left" \| "bottom-right" \| "top-left" \| "top-right"` | `"bottom-left"` |
| `className`| `string`                                         | —               |

### `useContentOverlay()`

Hook for reading edit-mode state (`isAdmin`, `isEditMode`, `pendingCount`, etc.) from custom components.

## Server API

| Export             | From                           | Description |
|--------------------|--------------------------------|-------------|
| `createContentAPI` | `next-content-overlay/server`  | Factory returning a catch-all route handler. |
| `getContent`       | `next-content-overlay/server`  | Reads `content/site.json` for SSR. |
| `ContentStorage`   | `next-content-overlay/server`  | Class wrapping the file-backed store. Useful for scripts. |
| `defaultAdminCheck`| `next-content-overlay/server`  | The built-in admin check (dev-mode + secret cookie). |

### `createContentAPI(options?)`

```ts
createContentAPI({
  isAdmin: (request) => boolean | Promise<boolean>, // Custom admin check
  contentDir: process.cwd(),                         // Where to read/write files
  revalidatePaths: ["/"],                            // Next.js paths to revalidate on publish
});
```

Sub-routes mounted under `[...action]`:

| Method | Path                        | Purpose |
|--------|-----------------------------|---------|
| GET    | `/me`                       | Admin check + unpublished count |
| GET    | `/content?keys=a,b&includeDraft=1` | Fetch published or draft values |
| POST   | `/save`                     | Upsert a draft (increments version, logs history) |
| POST   | `/publish`                  | Promote drafts to `content/site.json` |
| GET    | `/history?key=hero.title`   | List version history for a key |
| POST   | `/restore`                  | Restore a historical version as a new draft |
| POST   | `/login`                    | Validate the shared secret and set a cookie |

## Making edits persist

Where you run the editor determines how your changes stick around. The
default storage backend is **file-based** — drafts and published content live
in JSON files in your repo:

- **Local dev (`npm run dev`)** — edits write to `content/site.json` and
  `.overlay-content/*` on your disk. Commit those files to git to ship them.
  This is the intended workflow with the default backend: edit visually, then
  `git add content/ && git commit && git push`.
- **Deployed host (Vercel, Netlify, Cloudflare, etc.)** — the filesystem is
  ephemeral, so any "publish" made against the live site with the default
  backend is **lost on the next deploy**. Treat the deployed editor as a
  preview only, or plug in a durable storage adapter (see below).
- **Want edits from the live site to persist?** Implement a `StorageAdapter`
  backed by your own database, blob store, or the GitHub API. The seam is
  built in as of v1.1 — see the next section.

**TL;DR:** for local-only or solo workflows, edit → publish → commit → push.
For team / production editing, plug in a custom storage adapter.

## Pluggable storage (v1.1+)

The default `ContentStorage` writes to JSON files. If you want edits to persist
somewhere durable — Postgres, Supabase, Redis, S3, GitHub via the API, your own
internal service — implement the `StorageAdapter` interface and pass an
instance into `createContentAPI` and `getContent`.

```ts
import type { StorageAdapter } from "next-content-overlay/server";

export class PostgresAdapter implements StorageAdapter {
  constructor(private db: MyDbClient) {}

  async getPublished()                       { /* SELECT key, value FROM content_published */ }
  async getContent(keys, includeDraft)       { /* fetch by keys, overlay drafts if admin */ }
  async saveDraft(key, value, baseValue)     { /* INSERT ... RETURNING version */ }
  async publish(keys)                        { /* copy drafts → published in a tx */ }
  async getHistory(key, limit)               { /* SELECT ... ORDER BY version DESC */ }
  async restoreVersion(key, version)         { /* clone old row as new draft */ }
  async getUnpublishedCount()                { /* SELECT count(*) WHERE draft <> published */ }
}
```

Wire it into the route handler and your SSR helper:

```ts
// app/api/content-overlay/[...action]/route.ts
import { createContentAPI } from "next-content-overlay/server";
import { PostgresAdapter } from "@/lib/content-adapter";

const storage = new PostgresAdapter(db);
const handler = createContentAPI({ storage });
export const GET = handler;
export const POST = handler;
```

```ts
// app/layout.tsx
import { getContent } from "next-content-overlay/server";
import { storage } from "@/lib/content-adapter";

const content = await getContent({ storage });
```

That's the whole integration. Once your adapter is wired in, edits made from
the live deployed site survive deploys, and your non-technical teammates can
edit copy without a git commit.

The `StorageAdapter` interface is intentionally tiny (7 methods, all
key/value + versioning). The file-backed `ContentStorage` is the reference
implementation — read [`src/server/storage.ts`](src/server/storage.ts) when
building your own.

> **No official DB drivers ship in this package.** That's deliberate — picking
> Postgres vs. Supabase vs. Mongo vs. GitHub is your call, not the library's.
> Community adapters welcome via PR.

## Auth & admin access

Three layered defaults, pick whichever fits:

1. **No config** — you're automatically admin in `NODE_ENV === "development"`.
2. **`CONTENT_OVERLAY_SECRET`** env var — in production, users hit `Ctrl+Shift+E`, type the
   secret once in a modal, and an httpOnly cookie keeps them signed in.
3. **Custom callback** — `createContentAPI({ isAdmin: (req) => myAuthCheck(req) })` to
   integrate with your existing session / Supabase / Auth.js setup.

## CLI commands (secondary workflow)

The v0.1 CLI still ships and shares storage with the visual editor — so a change
made in one shows up in the other.

```bash
content-overlay init [--force]     # Create config + content files
content-overlay scan               # Scan JSX for text strings
content-overlay edit <key> <val>   # Update a draft value
content-overlay publish            # Promote drafts to published content
content-overlay setup [--force]    # Scaffold the visual-editor API route
content-overlay --help
content-overlay --version
```

Generated files:

| File | Purpose |
|------|---------|
| `content-overlay.config.json` | Scan dirs, extensions, file paths |
| `content/site.json` | Published content (your app reads this) |
| `.overlay-content/content-map.json` | Auto-generated key → source mapping |
| `.overlay-content/draft.json` | Working drafts (versioned `DraftEntry` objects) |
| `.overlay-content/history.json` | Per-key version history |
| `.overlay-content/last-publish.json` | Publish metadata |

## 5-minute demo

A runnable Next.js demo app is included:

```bash
cd examples/next-demo
npm install
npm run dev
```

Open `http://localhost:3000`, press `Ctrl+Shift+E`, click the headline, edit it, save,
then click **Publish Drafts**. Refresh — the new text is in `content/site.json`.

## Migrating from v0.1

See [CHANGELOG.md](CHANGELOG.md#100---plug-and-play-inline-cms) for the full migration
guide. The short version: the CLI keeps working, `content/site.json` is unchanged, and
the draft file format auto-migrates on first read (with a backup).

## Local development

```bash
npm install
npm run check
```

`npm run check` runs typecheck, tests, build, and license check.

## Show your setup

If you're using `next-content-overlay` in a project, we'd love to see it in action.
Share a short screen capture in [Show & Tell Discussions](../../discussions/categories/show-and-tell).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT — see [LICENSE](LICENSE).

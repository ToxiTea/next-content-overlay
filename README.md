# next-content-overlay

**Plug-and-play inline CMS for Next.js — click text on the page, edit it, publish. No database.**

`next-content-overlay` gives any Next.js App Router project a Squarespace-style inline editor in three files. Your content lives in a plain JSON file in your repo. Version control handles history. There is no CMS platform, no vendor lock-in, no config hell.

It started as a CLI-only tool in v0.1 (`init → scan → edit → publish`). As of **v1.0** the primary interface is a React component + server bundle that you drop into a layout — and the CLI is still there as a secondary workflow when you'd rather edit copy from the terminal.

> **From v0.1 → v1.0:** the CLI still ships and still works. The big upgrade is that you can now edit text visually, on the page, with drafts and version history, without leaving the browser. See [CHANGELOG.md](CHANGELOG.md) for the full migration guide.

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

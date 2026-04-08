# next-content-overlay

**Edit your Next.js text content from the CLI — no database, no re-prompting your AI.**

If you're a vibe coder or AI-first builder, you know the pain: your app's text lives scattered across dozens of components, and every copy change means either digging into database tables or writing another natural language prompt and hoping the AI touches the right file. Multiply that by 50+ pages of real content and it becomes unmanageable.

`next-content-overlay` gives you a Squarespace-style content layer for Next.js App Router projects — except it's file-backed, CLI-driven, and works with your existing codebase. No CMS platform, no vendor lock-in, no config hell.

### The flow

```
init → scan → edit → publish
```

1. **Scan** your JSX and automatically detect every text string
2. **Edit** any string by its generated key — one command, instant draft
3. **Publish** when you're ready — drafts stay separate until you say go

Your content lives in a simple JSON file. Your source code stays untouched. Version control handles the rest.

### Why this exists

When your app has real, comprehensive text content — frameworks, guides, course material, marketing copy — you need a way to iterate on words without re-entering your code editor or AI chat every time. This tool lets you treat content as a first-class, editable layer on top of your Next.js app.

## Install

```bash
npm i -D next-content-overlay
```

## Quickstart

Run from your Next.js repo root:

```bash
npx content-overlay init
npx content-overlay scan
npx content-overlay edit app.page.your-key "Your updated text"
npx content-overlay publish
```

Use a key from `.overlay-content/content-map.json` for the `edit` command.

## Commands

```bash
content-overlay init [--force]    # Create config + content files
content-overlay scan              # Scan JSX for text strings
content-overlay edit <key> <val>  # Update a draft value
content-overlay publish           # Promote drafts to published content
content-overlay --help
content-overlay --version
```

## Generated files

| File | Purpose |
|------|---------|
| `content-overlay.config.json` | Scan dirs, extensions, file paths |
| `content/site.json` | Published content (your app reads this) |
| `.overlay-content/content-map.json` | Auto-generated key → source mapping |
| `.overlay-content/draft.json` | Working drafts before publish |
| `.overlay-content/last-publish.json` | Publish metadata |

## 5-minute demo

A runnable Next.js demo app is included:

```bash
cd examples/next-demo
npm install
npm run overlay:flow
npm run dev
```

Then open `http://localhost:3000` to see content loaded from the overlay.

## How it works with AI coding

If you're building with Cursor, Claude Code, Copilot, or any AI assistant:

1. Let your AI scaffold components with placeholder text as usual
2. Run `content-overlay scan` to extract all text into a structured map
3. Edit content independently — no need to prompt your AI for every word change
4. Your AI keeps building features; you keep refining copy in parallel

This separates the "build" loop from the "write" loop, so neither blocks the other.

## Local development

```bash
npm install
npm run check
```

`npm run check` runs typecheck, tests, build, and license check.

## Show your setup

If you're using `next-content-overlay` in a project, we'd love to see it in action. Record a short screen capture of your workflow and share it in [Show & Tell Discussions](../../discussions/categories/show-and-tell).

Standout demos may be featured in this README.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT — see [LICENSE](LICENSE).

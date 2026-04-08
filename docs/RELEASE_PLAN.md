# Release Plan

## Target: `v0.1.0`

Goal: ship a stable first OSS release focused on one workflow:

`init -> scan -> edit -> publish`

## Release gates

- `npm run check` passes locally.
- Demo app flow works in `examples/next-demo`.
- README quickstart is verified by a clean install.
- No out-of-scope features are included.

## Pre-release checklist

1. Confirm `package.json` version is correct.
2. Update changelog/release notes draft.
3. Run:
   - `npm install`
   - `npm run check`
4. Smoke test demo:
   - `cd examples/next-demo`
   - `npm install`
   - `npm run overlay:flow`
   - `npm run dev`
5. Confirm license and OSS docs exist:
   - `LICENSE`
   - `CONTRIBUTING.md`
   - `CODE_OF_CONDUCT.md`
   - issue templates

## Publish steps

1. Tag release commit:
   - `git tag v0.1.0`
   - `git push origin v0.1.0`
2. Create GitHub Release:
   - title: `v0.1.0`
   - include highlights and migration notes (if any)
3. Publish to npm:
   - `npm publish --access public`
4. Verify install:
   - `npm info next-content-overlay version`

## Post-release

- Monitor issues for first-run friction.
- Prioritize fixes that improve setup reliability and error clarity.
- Defer feature expansion until core workflow feedback stabilizes.

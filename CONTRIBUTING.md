# Contributing

Thanks for contributing to `next-content-overlay`.

## Project scope

Keep changes aligned with the core flow:

`init -> scan -> edit -> publish`

Please avoid adding:
- monetization features
- non-Next.js framework support
- page-builder behavior

## Local setup

```bash
npm install
npm run check
```

## Development expectations

- Keep modules small and focused.
- Prefer practical defaults over extra configuration.
- Add tests for behavioral changes.
- Update docs for user-visible changes.

## Pull requests

1. Create a focused branch.
2. Add or update tests.
3. Run `npm run check`.
4. Open a PR with:
   - problem statement
   - proposed change
   - test evidence

## Reporting security issues

Do not open public issues for security vulnerabilities.
Please report privately to the maintainers.

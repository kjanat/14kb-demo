# PROJECT KNOWLEDGE BASE

**Generated:** 2026-03-17 **Commit:** 63fb54f **Branch:** master

## OVERVIEW

Self-referential single-page website that fits within one TCP initial congestion
window (14,600 bytes raw). Bun bundles `src/` into a single `dist/index.html`
with inlined CSS + JS. The page describes its own size constraint and displays
an accurate byte breakdown.

## STRUCTURE

```
14kb-demo/
├── src/
│   ├── index.html        # HTML template with {{PLACEHOLDER}} tokens
│   ├── style.css         # All styles (dark theme, responsive, ~480 lines)
│   └── main.ts           # Scroll, IntersectionObserver reveals, smooth scroll
├── scripts/
│   └── build.ts          # Custom build pipeline (bundle → minify → inject → enforce)
├── .github/workflows/
│   └── pages.yml         # CI: build + deploy to GitHub Pages
└── dist/
    └── index.html        # Build output (gitignored), single self-contained file
```

## WHERE TO LOOK

| Task                  | Location                      | Notes                                                   |
| --------------------- | ----------------------------- | ------------------------------------------------------- |
| Add/edit page content | `src/index.html`              | Uses `{{MUSTACHE}}` placeholders resolved at build time |
| Change styles         | `src/style.css`               | ~52% of total budget; mobile fixes at bottom            |
| Edit client JS        | `src/main.ts`                 | ~5% of budget; vanilla DOM only, no framework           |
| Fix build pipeline    | `scripts/build.ts`            | Bun.build → minifyHtml → inject → size check            |
| Fix CI/deploy         | `.github/workflows/pages.yml` | No test/lint steps; build failure = only gate           |
| Check size budget     | `scripts/build.ts`            | `initcwnd = 14_600`; exits with overage as exit code    |

## CONVENTIONS

- **Bun-only toolchain** — no npm/yarn/pnpm, no Vite/Webpack
- **Tabs, single quotes** — dprint with remote config (`kjanat/kjanat` repo)
- **`tsgo` for type-checking** — `@typescript/native-preview`, not `tsc`
- **No linter in CI** — biome for local linting only
- **`master` branch** — not `main`
- **Zero runtime deps** — devDependencies are types-only

## BUILD PIPELINE

```
src/index.html ──┐
src/style.css  ──┼─▶ Bun.build(compile:true) ─▶ minifyHtml() ─▶ inject() ─▶ dist/index.html
src/main.ts    ──┘    (inlines CSS+JS,           (collapse HTML    (fixed-point
                       minifies CSS+JS)            whitespace,       iteration:
                                                   preserve          resolve
                                                   style/script)     {{PLACEHOLDERS}})
```

### Size budget enforcement

Build computes raw + gzip sizes. If raw >= 14,600 bytes, `process.exit(overage)`.
The exit code IS the byte count over budget. CI treats any non-zero exit as failure.

### Self-referential placeholders

`{{FILESIZE}}`, `{{CSS_SIZE}}`, `{{CSS_PCT}}`, `{{HTML_SIZE}}`, `{{HTML_PCT}}`,
`{{JS_SIZE}}`, `{{JS_PCT}}` — injected sizes change the file size, so the build
loops (max 10 iterations) until output stabilizes. Always injects into the clean
template per iteration.

## ANTI-PATTERNS (THIS PROJECT)

- **No `!` non-null assertions** — one exists at `scripts/build.ts:44`, should
  be replaced with `?? ''`
- **No `any`, no `as Type`** — enforced by `tsconfig.json` strict +
  `noUncheckedIndexedAccess`
- **Don't commit `dist/`** — gitignored, CI builds fresh

## GOTCHAS

- **`dev` script `--watch` is a no-op** — flag is passed but `build.ts` never
  reads `process.argv`; it runs a single build and exits
- **Remote dprint config** — `bun run fmt` requires network access; no local
  fallback
- **Exit code wrapping** — overshoot > 255 bytes wraps modulo 256 on Unix;
  exit codes 126-128 collide with shell signal meanings
- **CI skips `bun install`** — works only because build uses zero node_modules
  at runtime; adding any runtime dep will silently break CI
- **CI skips typecheck + lint** — only the size budget check gates deployment
- **Bun `compile:true` for browser** — relatively new feature; HTML structure
  is NOT minified by Bun, hence the custom `minifyHtml()` post-processor
- **Fixed-point convergence** — no explicit convergence check; silently stops
  after 10 iterations even if not converged

## COMMANDS

```bash
bun run build       # Bundle, minify, inject, size-check → dist/index.html
bun run dev         # Same as build (--watch flag is ignored)
bun run fmt         # Format via remote dprint config (needs network)
bun run typecheck   # tsgo --noEmit (not in CI)
```

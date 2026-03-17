# 14K — One Packet, One Page

A self-referential website that fits entirely within one TCP initial congestion window (14,600 bytes). Everything — HTML, CSS, JS, layout, animations, responsive design — ships in a single file, zero round trips.

**[Live demo](https://kjanat.github.io/14kb-demo/)**

## Why 14,600 bytes?

TCP connections start with an initial congestion window (initcwnd) of 10 segments × 1,460 bytes = **14,600 bytes**. That's all a server can send before waiting for an ACK. This page proves you can deliver a complete, polished experience within that first burst.

## What's in the budget

The page displays its own byte breakdown — CSS (~52%), HTML (~40%), JS (~5%) — computed at build time via self-referential placeholder injection.

No frameworks. No fonts. No images. No analytics. No cookie banner. Zero runtime dependencies.

## Build

Requires [Bun](https://bun.sh).

```bash
bun install         # install dev dependencies (types only)
bun run build       # bundle → minify → inject → size-check → dist/index.html
bun run dev         # same as build (watch not yet implemented)
bun run fmt         # format via remote dprint config
bun run typecheck   # tsgo --noEmit
```

The build pipeline:

1. `Bun.build` compiles `src/index.html` + `style.css` + `main.ts` into a single file with inlined, minified CSS and JS
2. Custom HTML whitespace collapsing (Bun doesn't minify HTML structure)
3. Fixed-point iteration resolves `{{PLACEHOLDER}}` tokens — sizes are self-referential, so the build loops until output stabilizes
4. Size enforcement — if raw output ≥ 14,600 bytes, the build fails with the overage as exit code

## Deploy

Pushes to `master` trigger GitHub Actions → GitHub Pages. The size budget is the only gate — no lint or test steps in CI.

## License

MIT

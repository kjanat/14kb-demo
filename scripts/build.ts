/**
 * Build script: bundles src/ into a single self-contained index.html
 *
 * 1. Bun-bundles main.ts (tree-shakes, minifies JS)
 * 2. Extracts CSS imported by main.ts via Bun's CSS loader
 * 3. Injects <style> and <script> into src/index.html template
 * 4. Writes dist/index.html
 */

import { existsSync, mkdirSync } from 'node:fs';

const SRC = 'src';
const DIST = 'dist';
const TEMPLATE = `${SRC}/index.html`;
const ENTRY = `${SRC}/main.ts`;

if (!existsSync(DIST)) mkdirSync(DIST, { recursive: true });

// Bundle JS (Bun extracts imported CSS as a separate output)
const result = await Bun.build({
	entrypoints: [ENTRY],
	minify: true,
	target: 'browser',
	outdir: DIST,
	naming: '[name].[ext]',
});

if (!result.success) {
	console.error('Build failed:');
	for (const log of result.logs) console.error(log);
	process.exit(1);
}

// Collect outputs
let js = '';
let css = '';

for (const output of result.outputs) {
	const text = await output.text();
	if (output.path.endsWith('.js')) js = text;
	if (output.path.endsWith('.css')) css = text;
}

// Read HTML template
const html = await Bun.file(TEMPLATE).text();

// Minify HTML via HTMLRewriter: strips inter-tag whitespace while
// preserving text content intact (no word-merging bugs).
async function minifyHtml(src: string): Promise<string> {
	let inRaw = 0; // depth inside <style>/<script>

	const rewriter = new HTMLRewriter()
		.on('style, script', {
			element(el) {
				inRaw++;
				el.onEndTag(() => { inRaw--; });
			},
		})
		.on('*', {
			text(text) {
				if (inRaw > 0) return; // preserve <style>/<script> content
				if (/^\s+$/.test(text.text)) {
					text.remove(); // whitespace-only text node → remove
				} else {
					text.replace(text.text.replace(/\s{2,}/g, ' '), { html: false });
				}
			},
		});

	return await rewriter.transform(new Response(src)).text();
}

// Inject CSS + JS, then minify
const injected = html
	.replace('<!-- CSS_INJECT -->', `<style>${css}</style>`)
	.replace('<!-- JS_INJECT -->', `<script>${js}</script>`);
const final = await minifyHtml(injected);

// Write output
await Bun.write(`${DIST}/index.html`, final);

// Clean intermediate files
const { unlinkSync } = await import('node:fs');
for (const output of result.outputs) {
	try {
		unlinkSync(output.path);
	} catch {
		// ignore
	}
}

// Stats
const size = new Blob([final]).size;
const gzip = Bun.gzipSync(new TextEncoder().encode(final)).length;
const initcwnd = 14_600;

console.log(`dist/index.html`);
console.log(`  raw:  ${size.toLocaleString()} B (${((size / initcwnd) * 100).toFixed(0)}% of initcwnd)`);
console.log(`  gzip: ${gzip.toLocaleString()} B (${((gzip / initcwnd) * 100).toFixed(0)}% of initcwnd)`);
if (size >= initcwnd) {
	console.error(`  EXCEEDS initcwnd by ${size - initcwnd} B — needs compression`);
	process.exit(size - initcwnd);
} else {
	console.log(`  fits in one initcwnd (${initcwnd - size} B to spare)`);
}

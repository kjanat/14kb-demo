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

// Minify HTML: collapse whitespace outside <style>/<script> blocks,
// preserving word boundaries in text content.
function minifyHtml(src: string): string {
	// 1. Extract <style>/<script> blocks so regex won't touch them
	const preserved: string[] = [];
	const placeholder = (i: number) => `\x00${i}\x00`;
	const withPlaceholders = src.replace(
		/<(style|script)\b[^>]*>[\s\S]*?<\/\1>/gi,
		(match) => {
			preserved.push(match);
			return placeholder(preserved.length - 1);
		},
	);

	// 2. Collapse whitespace in the HTML shell
	const minified = withPlaceholders
		.replace(/\n\s*/g, ' ') // newline+indent → single space (preserves word gaps)
		.replace(/>\s+</g, '><') // strip whitespace between tags
		.replace(/\s{2,}/g, ' ') // collapse remaining runs
		.trim();

	// 3. Restore <style>/<script> blocks verbatim
	return minified.replace(/\x00(\d+)\x00/g, (_, i) => preserved[Number(i)]!);
}

// Inject CSS + JS, then minify
const final = minifyHtml(
	html
		.replace('<!-- CSS_INJECT -->', `<style>${css}</style>`)
		.replace('<!-- JS_INJECT -->', `<script>${js}</script>`),
);

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

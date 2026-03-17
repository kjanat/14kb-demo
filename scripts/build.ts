/**
 * Build script: uses Bun's native standalone HTML bundling to produce
 * a single self-contained index.html with inlined CSS + JS.
 *
 * Enforces the TCP initial congestion window size budget (14,600 B).
 */

const result = await Bun.build({
	entrypoints: ['src/index.html', 'src/styles.html'],
	compile: true,
	target: 'browser',
	outdir: 'dist',
	minify: true,
});

if (!result.success) {
	console.error('Build failed:');
	for (const log of result.logs) console.error(log);
	process.exit(1);
}

const output = result.outputs[0];
if (!output) {
	console.error('No output produced');
	process.exit(1);
}

// Bun minifies CSS/JS but not HTML structure — collapse whitespace
// outside <style>/<script> blocks while preserving text word gaps.
function minifyHtml(src: string): string {
	const preserved: string[] = [];
	const withPlaceholders = src.replace(
		/<(style|script)\b[^>]*>[\s\S]*?<\/\1>/gi,
		(match) => {
			preserved.push(match);
			return `\x00${preserved.length - 1}\x00`;
		},
	);
	const minified = withPlaceholders
		.replace(/\n\s*/g, ' ')
		.replace(/>\s+</g, '><')
		.replace(/\s{2,}/g, ' ')
		.trim();
	return minified.replace(/\x00(\d+)\x00/g, (_, i) => preserved[Number(i)]!);
}

// Compute byte breakdown from an HTML string.
function breakdown(src: string) {
	const total = new Blob([src]).size;
	const cssMatch = src.match(/<style[^>]*>[\s\S]*?<\/style>/);
	const jsMatch = src.match(/<script[^>]*>[\s\S]*?<\/script>/);
	const css = cssMatch ? new Blob([cssMatch[0]]).size : 0;
	const js = jsMatch ? new Blob([jsMatch[0]]).size : 0;
	const html = total - css - js;
	return { total, css, js, html };
}

// Format bytes as human-readable size string.
function fmtSize(bytes: number): string {
	return bytes >= 1000
		? `${(bytes / 1000).toFixed(1)} KB`
		: `${bytes} B`;
}

// Resolve all {{…}} placeholders via fixed-point iteration — sizes
// are self-referential so we loop until the output stabilizes.
// Always inject into the clean template and compare results.
const template = minifyHtml(await output.text());
let html = template;
const MAX_ITER = 10;

function inject(src: string, b: ReturnType<typeof breakdown>): string {
	const replacements: Record<string, string> = {
		'{{FILESIZE}}': b.total.toLocaleString(),
		'{{CSS_SIZE}}': fmtSize(b.css),
		'{{CSS_PCT}}': Math.round((b.css / b.total) * 100).toString(),
		'{{HTML_SIZE}}': fmtSize(b.html),
		'{{HTML_PCT}}': Math.round((b.html / b.total) * 100).toString(),
		'{{JS_SIZE}}': fmtSize(b.js),
		'{{JS_PCT}}': Math.round((b.js / b.total) * 100).toString(),
	};
	let out = src;
	for (const [placeholder, value] of Object.entries(replacements)) {
		out = out.replaceAll(placeholder, value);
	}
	return out;
}

for (let i = 0; i < MAX_ITER; i++) {
	const next = inject(template, breakdown(html));
	if (next === html) break; // converged
	html = next;
}

await Bun.write('dist/index.html', html);

const b = breakdown(html);
const initcwnd = 14_600;
const gzip = Bun.gzipSync(new TextEncoder().encode(html)).length;
const pct = (n: number) => ((n / b.total) * 100).toFixed(1);

console.log(`dist/index.html`);
console.log(`  raw:  ${b.total.toLocaleString()} B (${((b.total / initcwnd) * 100).toFixed(0)}% of initcwnd)`);
console.log(`  gzip: ${gzip.toLocaleString()} B (${((gzip / initcwnd) * 100).toFixed(0)}% of initcwnd)`);
console.log(`  css:  ${b.css.toLocaleString()} B (${pct(b.css)}%)`);
console.log(`  html: ${b.html.toLocaleString()} B (${pct(b.html)}%)`);
console.log(`  js:   ${b.js.toLocaleString()} B (${pct(b.js)}%)`);
if (b.total >= initcwnd) {
	console.error(`  EXCEEDS initcwnd by ${b.total - initcwnd} B — needs compression`);
	process.exit(b.total - initcwnd);
} else {
	console.log(`  fits in one initcwnd (${initcwnd - b.total} B to spare)`);
}

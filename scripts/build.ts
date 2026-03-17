/**
 * Build script: uses Bun's native standalone HTML bundling to produce
 * a single self-contained index.html with inlined CSS + JS.
 *
 * Enforces the TCP initial congestion window size budget (14,600 B).
 */

const result = await Bun.build({
	entrypoints: ['src/index.html'],
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

const html = minifyHtml(await output.text());
await Bun.write('dist/index.html', html);

const size = new Blob([html]).size;
const content = new TextEncoder().encode(html);
const gzip = Bun.gzipSync(content).length;
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

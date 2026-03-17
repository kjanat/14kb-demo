interface SchemeColors {
	bg: string;
	surface: string;
	card: string;
	border: string;
	text: string;
	muted: string;
	accent: string;
	accent2: string;
}

interface Scheme {
	id: string;
	name: string;
	colors: SchemeColors;
	thumbGrad: string;
	tag?: string;
	scrollHint?: boolean;
	light?: boolean;
}

const SWATCH_KEYS: ReadonlyArray<keyof SchemeColors> = [
	'bg',
	'surface',
	'card',
	'border',
	'text',
	'muted',
	'accent',
	'accent2',
];

const SCHEMES: readonly Scheme[] = [
	{
		id: 'purple',
		name: 'Purple',
		tag: 'Current',
		scrollHint: true,
		colors: {
			bg: '#0a0a0f',
			surface: '#13131a',
			card: '#1a1a24',
			border: '#2a2a3a',
			text: '#e4e4ec',
			muted: '#8888a0',
			accent: '#6c5ce7',
			accent2: '#a29bfe',
		},
		thumbGrad: '#1a1a2e, #16213e',
	},
	{
		id: 'amber',
		name: 'Amber Terminal',
		colors: {
			bg: '#0a0a08',
			surface: '#14140e',
			card: '#1e1e14',
			border: '#3a3a28',
			text: '#e8e0c8',
			muted: '#a09878',
			accent: '#e7a832',
			accent2: '#fec95c',
		},
		thumbGrad: '#1e1a08, #2e2810',
	},
	{
		id: 'cyan',
		name: 'Cyan / Teal',
		colors: {
			bg: '#080f12',
			surface: '#0e1a1f',
			card: '#142228',
			border: '#1e3640',
			text: '#dceef4',
			muted: '#7aa8b8',
			accent: '#00b4d8',
			accent2: '#48cae4',
		},
		thumbGrad: '#0a1820, #122a34',
	},
	{
		id: 'emerald',
		name: 'Emerald',
		colors: {
			bg: '#060d0a',
			surface: '#0c1a14',
			card: '#12241c',
			border: '#1e3a2c',
			text: '#d8ece4',
			muted: '#6ea88c',
			accent: '#00c170',
			accent2: '#34d399',
		},
		thumbGrad: '#081a10, #103020',
	},
	{
		id: 'rose',
		name: 'Rose',
		colors: {
			bg: '#0f0a0c',
			surface: '#1a1318',
			card: '#241a20',
			border: '#3a2a34',
			text: '#ece4e8',
			muted: '#a88898',
			accent: '#e74c6f',
			accent2: '#fe7b9b',
		},
		thumbGrad: '#2e0a18, #401428',
	},
	{
		id: 'light',
		name: 'Light',
		light: true,
		colors: {
			bg: '#fafafa',
			surface: '#f0f0f4',
			card: '#ffffff',
			border: '#d8d8e0',
			text: '#1a1a2e',
			muted: '#6e6e82',
			accent: '#3b5fe7',
			accent2: '#6b8cfe',
		},
		thumbGrad: '#e8ecf8, #d0d8f0',
	},
];

const BARS: ReadonlyArray<{ label: string; width: number }> = [
	{ label: 'CSS', width: 52 },
	{ label: 'HTML', width: 40 },
	{ label: 'JS', width: 5 },
];

// ── Generate dot nav + scheme sections ──

const dotsEl = document.getElementById('dots');
if (dotsEl) {
	const total = SCHEMES.length;
	let i = 0;

	for (const s of SCHEMES) {
		const c = s.colors;

		// Dot nav link
		const dot = document.createElement('a');
		dot.href = `#${s.id}`;
		dot.title = s.name;
		dotsEl.appendChild(dot);

		// Swatches
		const swatches = SWATCH_KEYS.map(
			(k) =>
				`<div class="swatch"><div class="swatch-dot" style="background:${
					c[k]
				}"></div><span class="swatch-label">${k}</span></div>`,
		).join('');

		// Bars
		const bars = BARS.map(
			(b) =>
				`<div class="bar-row"><span class="bar-label">${b.label}</span><div class="bar-track"><div class="bar-fill" style="width:${b.width}%"></div></div><span class="bar-val">~${b.width}%</span></div>`,
		).join('');

		// Section element
		const section = document.createElement('div');
		section.className = `scheme${s.light ? ' scheme--light' : ''}`;
		section.id = s.id;
		section.style.cssText =
			`--bg:${c.bg};--surface:${c.surface};--card:${c.card};--border:${c.border};--text:${c.text};--muted:${c.muted};--accent:${c.accent};--accent2:${c.accent2};--gradient:linear-gradient(135deg,${c.accent},${c.accent2})`;

		section.innerHTML = `<div class="scheme-inner">
	<div class="scheme-header">
		<div class="scheme-name">${s.name}</div>
		${s.tag ? `<div class="scheme-tag">${s.tag}</div>` : ''}
		<div class="scheme-counter">${i + 1} / ${total}</div>
	</div>
	<div class="swatches">${swatches}</div>
	<div class="section-label">The Challenge</div>
	<h2 class="section-heading">14,600 bytes. No second chances.</h2>
	<p class="section-text">The first thing a server sends is limited by TCP\u2019s initial congestion window \u2014 10 segments of 1,460 bytes.</p>
	<div class="btns">
		<a class="btn btn-primary">How It Works</a>
		<a class="btn btn-outline">View Source</a>
	</div>
	<div class="bars">${bars}</div>
	<div class="card">
		<div class="card-thumb" style="background:linear-gradient(135deg,${s.thumbGrad})">&#9889;</div>
		<div class="card-body">
			<h3>Zero Dependencies</h3>
			<p>System font stack, CSS custom properties, vanilla JS.</p>
			<div class="tags"><span class="tag">System Fonts</span><span class="tag">CSS Variables</span><span class="tag">Vanilla JS</span></div>
		</div>
	</div>
</div>
${s.scrollHint ? '<div class="scroll-hint">Scroll</div>' : ''}`;

		document.body.appendChild(section);
		i++;
	}

	// Dot nav active state via IntersectionObserver
	const dots = dotsEl.querySelectorAll('a');
	const obs = new IntersectionObserver(
		(entries) => {
			for (const e of entries) {
				if (e.isIntersecting) {
					const id = e.target.id;
					for (const d of dots) {
						d.classList.toggle(
							'active',
							d.getAttribute('href') === `#${id}`,
						);
					}
				}
			}
		},
		{ threshold: 0.6 },
	);
	for (const s of document.querySelectorAll('.scheme')) obs.observe(s);
}

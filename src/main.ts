import './style.css';

// Nav scroll effect
const nav = document.getElementById('nav')!;
window.addEventListener('scroll', () => {
	nav.classList.toggle('scrolled', scrollY > 50);
});

// Intersection observer for reveal animations + skill bars
const io = new IntersectionObserver(
	(entries) => {
		entries.forEach((e) => {
			if (e.isIntersecting) {
				e.target.classList.add('visible');
				const fill = e.target.querySelector<HTMLElement>('.skill-fill');
				if (fill) fill.style.width = fill.dataset.w + '%';
				io.unobserve(e.target);
			}
		});
	},
	{ threshold: 0.15 },
);

document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

// Smooth scroll for anchor links
document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((a) => {
	a.addEventListener('click', (e) => {
		e.preventDefault();
		const target = document.querySelector(a.getAttribute('href')!);
		if (target) target.scrollIntoView({ behavior: 'smooth' });
	});
});

// GIFs start only after a deliberate Play. Pausing returns the useful still;
// leaving the viewport or tab never leaves a hidden animation running.
(() => {
	if (window.ghaMotionPictures) {
		window.ghaMotionPictures.mount(document);
		return;
	}
	const instances = new Map();
	const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

	function stopAll() {
		for (const instance of instances.values()) instance.stop();
	}

	function mount(root) {
		for (const [figure, instance] of instances) {
			if (figure.isConnected) continue;
			instance.stop();
			instance.observer?.disconnect();
			instances.delete(figure);
		}
		for (const figure of root.querySelectorAll('[data-motion-picture]')) {
			if (instances.has(figure)) continue;
			const image = figure.querySelector('[data-motion-image]');
			const button = figure.querySelector('[data-motion-toggle]');
			const status = figure.querySelector('[data-motion-status]');
			const { still, motion } = figure.dataset;
			if (!image || !button || !still || !motion) continue;
			let playing = false;
			let inView = !('IntersectionObserver' in window);
			function stop(message = '') {
				if (playing) image.src = still;
				playing = false;
				figure.dataset.playing = 'false';
				button.textContent = 'Play';
				button.setAttribute('aria-label', 'Play animation');
				button.setAttribute('aria-pressed', 'false');
				if (status) status.textContent = message;
			}
			function play() {
				if (document.hidden) return;
				if (!inView) {
					const box = figure.getBoundingClientRect();
					if (box.bottom <= 0 || box.top >= window.innerHeight) return;
				}
				playing = true;
				image.src = motion;
				figure.dataset.playing = 'true';
				button.textContent = 'Pause';
				button.setAttribute('aria-label', 'Pause animation');
				button.setAttribute('aria-pressed', 'true');
				if (status) status.textContent = 'Animation playing.';
			}
			button.addEventListener('click', () => playing ? stop() : play());
			image.addEventListener('error', () => {
				if (playing) stop('Animation unavailable. Showing the still.');
			});
			const observer = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
				inView = entries[0]?.isIntersecting ?? false;
				if (!inView) stop();
			}, { threshold: 0 }) : null;
			observer?.observe(figure);
			instances.set(figure, { stop, observer });
			stop();
			button.hidden = false;
		}
	}

	document.addEventListener('visibilitychange', () => { if (document.hidden) stopAll(); });
	window.addEventListener('pagehide', stopAll);
	window.addEventListener('beforeprint', stopAll);
	reduced.addEventListener('change', () => { if (reduced.matches) stopAll(); });
	document.addEventListener('astro:before-swap', stopAll);
	document.addEventListener('astro:page-load', () => mount(document));
	window.ghaMotionPictures = { mount, stopAll };
	mount(document);
})();

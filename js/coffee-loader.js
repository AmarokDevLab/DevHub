(() => {
    const MINIMUM_DURATION = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 0
        : 2590;
    const startedAt = performance.now();

    window.finishCoffeeLoader = (loader, onHidden) => {
        if (!loader || loader.dataset.closing === 'true') return;
        loader.dataset.closing = 'true';

        const remaining = Math.max(0, MINIMUM_DURATION - (performance.now() - startedAt));
        window.setTimeout(() => {
            loader.setAttribute('aria-hidden', 'true');
            loader.style.pointerEvents = 'none';
            loader.style.opacity = '0';
            loader.style.visibility = 'hidden';

            window.setTimeout(() => {
                loader.style.display = 'none';
                onHidden?.();
            }, 300);
        }, remaining);
    };
})();

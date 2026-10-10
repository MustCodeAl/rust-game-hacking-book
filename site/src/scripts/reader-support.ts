const mounted = new WeakSet<HTMLElement>();
const interactiveSelector = '[data-code-trace], [data-debugger-stepper], [data-cpu-step], [data-logic-waveform], [data-speedtype], .concept-lab, .sim-lab, .visual-lab, .academy-quiz, .ownership-scope, .projection-lab, [data-memory-mechanism], [data-hex-inspector]';
const modern = (): boolean => document.documentElement.dataset.academyAppearance === 'modern';

export function mountReaderSupport(): void {
  document.querySelectorAll<HTMLElement>('[data-reader-support]').forEach((root) => {
    if (mounted.has(root)) return;
    const open = root.querySelector<HTMLButtonElement>('[data-reader-hud-open]');
    const close = root.querySelector<HTMLButtonElement>('[data-reader-hud-close]');
    const dialog = root.querySelector<HTMLDialogElement>('[data-reader-hud]');
    const status = root.querySelector<HTMLElement>('[data-reader-support-status]');
    if (!open || !close || !dialog || !status) return;
    mounted.add(root);
    const abort = new AbortController();
    const options = { signal: abort.signal };
    document.querySelector('.lesson-actionbar')?.append(open);
    let returnFocus: HTMLElement | null = null;
    const show = (): void => {
      if (!modern() || dialog.open || document.querySelector('dialog[open], [aria-modal="true"]')) return;
      returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : open;
      dialog.showModal(); close.focus();
    };
    open.hidden = false;
    open.addEventListener('click', show, options);
    close.addEventListener('click', () => dialog.close(), options);
    dialog.addEventListener('close', () => { if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true }); returnFocus = null; }, options);
    dialog.addEventListener('click', (event: MouseEvent) => {
      if (event.target !== dialog) return;
      const bounds = dialog.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
    }, options);
    document.addEventListener('keydown', (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat || event.isComposing || event.ctrlKey || event.metaKey || event.altKey || event.key !== '?') return;
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest('input, textarea, select, [contenteditable], [role="textbox"], .speedtype')) return;
      if (!modern()) return;
      if (dialog.open) { event.preventDefault(); dialog.close(); return; }
      if (document.querySelector('dialog[open], [aria-modal="true"]')) return;
      event.preventDefault(); show();
    }, options);
    const anchors: HTMLAnchorElement[] = [];
    document.querySelectorAll<HTMLElement>('.sl-markdown-content :is(h2, h3)[id]').forEach((heading) => {
      if (heading.closest('.not-content, .expressive-code, .lesson-cheat')) return;
      const title = heading.textContent?.trim() ?? 'this section';
      const anchor = document.createElement('a');
      anchor.className = 'reader-heading-copy';
      anchor.href = `#${encodeURIComponent(heading.id)}`;
      anchor.dataset.readerCopyAnchor = '';
      anchor.setAttribute('aria-label', `Copy link to ${title}`);
      anchor.title = `Copy link to ${title}`;
      heading.append(anchor); anchors.push(anchor);
    });
    document.addEventListener('click', (event: MouseEvent) => {
      const anchor = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('[data-reader-copy-anchor]') : null;
      if (!anchor || !modern() || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
      const url = new URL(anchor.href, location.href); url.search = '';
      if (!navigator.clipboard) return;
      event.preventDefault();
      void navigator.clipboard.writeText(url.href).then(() => { status.textContent = 'Section link copied.'; }).catch(() => { location.hash = url.hash; status.textContent = 'Copy unavailable. This section’s link is now in the address bar.'; });
    }, options);
    const visible = new Set<Element>();
    const chatObservers = new Map<HTMLElement, MutationObserver>();
    const syncChatChrome = (): void => {
      for (const [host, observer] of chatObservers) { if (!host.isConnected) { observer.disconnect(); chatObservers.delete(host); } }
      const host = document.getElementById('context7-widget');
      if (!host) return;
      host.dataset.readerFinish = modern() ? 'modern' : 'original';
      host.dataset.readerInteractiveActive = document.documentElement.dataset.readerInteractiveActive ?? 'false';
      host.dataset.readerUtilityGradients = document.documentElement.dataset.academyGradients === 'off' ? 'off' : 'on';
      const shadow = host.shadowRoot;
      if (!shadow || chatObservers.has(host)) return;
      const style = document.createElement('style');
      style.dataset.readerUtilityStyle = '';
      style.textContent = `
        .reader-chat-decoration { display: none; }
        :host([data-reader-finish='modern']) .reader-chat-decoration { display: block; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; background: linear-gradient(110deg, transparent, color-mix(in srgb, var(--semantic-menu-data, currentColor) 8%, transparent)); opacity: 1; transition: opacity var(--reader-transition, 0.15s) var(--reader-easing, ease); }
        :host([data-reader-finish='modern'][data-reader-interactive-active='true']) .reader-chat-decoration { opacity: 0.25; }
        :host([data-reader-finish='modern']) .c7-bubble:is(:hover, :focus-within, :active) .reader-chat-decoration { opacity: 1; }
        :host([data-reader-utility-gradients='off']) .reader-chat-decoration { display: none; }
        @media (prefers-reduced-motion: reduce) { .reader-chat-decoration { transition: none !important; } }
      `;
      const addWash = (): void => {
        const bubble = shadow.querySelector('.c7-bubble');
        if (!bubble || bubble.querySelector('[data-reader-utility-decoration]')) return;
        const decoration = document.createElement('span'); decoration.className = 'reader-chat-decoration'; decoration.dataset.readerUtilityDecoration = ''; decoration.setAttribute('aria-hidden', 'true'); bubble.append(decoration);
      };
      const observer = new MutationObserver(addWash);
      chatObservers.set(host, observer); shadow.append(style); addWash(); observer.observe(shadow, { childList: true, subtree: true });
    };
    const publishActivity = (): void => {
      const focused = document.activeElement instanceof Element && document.activeElement.closest(interactiveSelector) !== null;
      document.documentElement.dataset.readerInteractiveActive = String(modern() && (visible.size > 0 || focused));
      syncChatChrome();
    };
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) { if (entry.isIntersecting) visible.add(entry.target); else visible.delete(entry.target); }
      publishActivity();
    }, { rootMargin: '-20% 0px -25% 0px', threshold: 0 });
    document.querySelectorAll(interactiveSelector).forEach((widget) => observer.observe(widget));
    const chatMounts = new MutationObserver(syncChatChrome);
    chatMounts.observe(document.body, { childList: true });
    syncChatChrome();
    document.addEventListener('focusin', publishActivity, options);
    document.addEventListener('focusout', () => queueMicrotask(publishActivity), options);
    document.addEventListener('academy:preferences', () => { if (!modern() && dialog.open) dialog.close(); publishActivity(); }, options);
    const printable = Array.from(document.querySelectorAll<HTMLDetailsElement>('.lesson-cheat > details, .cpu-step__clock-modern, .logic-waveform__reference'));
    const printStates = new Map<HTMLDetailsElement, boolean>();
    window.addEventListener('beforeprint', () => { printable.forEach((details) => { printStates.set(details, details.open); details.open = true; }); }, options);
    window.addEventListener('afterprint', () => { printStates.forEach((wasOpen, details) => { details.open = wasOpen; }); printStates.clear(); }, options);
    document.addEventListener('astro:before-swap', () => {
      if (dialog.open) dialog.close(); observer.disconnect(); abort.abort();
      chatMounts.disconnect(); chatObservers.forEach((chatObserver) => chatObserver.disconnect()); chatObservers.clear();
      anchors.forEach((anchor) => anchor.remove()); mounted.delete(root);
      delete document.documentElement.dataset.readerInteractiveActive;
    }, { ...options, once: true });
  });
}
document.addEventListener('astro:page-load', mountReaderSupport);

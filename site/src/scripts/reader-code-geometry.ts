interface CommentText {
  raw: string;
  decorated: string;
}

const mounted = new WeakSet<HTMLElement>();

/** Modern uses colour as paint: the legacy semantic engine must not add emoji
 * to comment text. Original retains that engine's existing decoration. */
export function mountReaderCodeGeometry(): void {
  const root = document.documentElement;
  if (mounted.has(root)) return;
  mounted.add(root);
  const comments = new Map<HTMLElement, CommentText>();
  const abort = new AbortController();
  let pending = false;
  const isModern = (): boolean => root.dataset.academyAppearance === 'modern';

  function reconcile(): void {
    if (isModern()) {
      document.querySelectorAll<HTMLElement>('.expressive-code [data-comment-original]').forEach((span) => {
        const raw = span.dataset.commentOriginal;
        if (raw === undefined) return;
        const text = span.textContent ?? '';
        const saved = comments.get(span);
        if (!saved || saved.raw !== raw) comments.set(span, { raw, decorated: text });
        else if (text !== raw) saved.decorated = text;
        if (text !== raw) span.textContent = raw;
      });
    }
    for (const [span, saved] of comments) {
      if (!span.isConnected || span.dataset.commentOriginal !== saved.raw) { comments.delete(span); continue; }
      if (!isModern() && span.textContent === saved.raw && saved.decorated !== saved.raw) span.textContent = saved.decorated;
    }
  }

  function schedule(): void {
    if (pending) return;
    pending = true;
    // Mutation observers and this microtask settle before paint, preventing a
    // decorated comment from wrapping briefly during a semantic-colour change.
    queueMicrotask(() => { pending = false; if (!abort.signal.aborted) reconcile(); });
  }

  const settings = new MutationObserver(schedule);
  settings.observe(root, { attributes: true, attributeFilter: ['data-academy-appearance', 'data-academy-semantic'] });
  const code = new MutationObserver((changes) => {
    if (!isModern() && comments.size === 0) return;
    const changedCode = changes.some((change) => {
      const target = change.target instanceof Element ? change.target : change.target.parentElement;
      if (target?.closest('.expressive-code')) return true;
      return Array.from(change.addedNodes).some((node) => node instanceof Element && (node.matches('.expressive-code') || node.querySelector('.expressive-code')));
    });
    if (changedCode) schedule();
  });
  code.observe(document.body, { subtree: true, childList: true });
  document.addEventListener('astro:before-swap', () => {
    settings.disconnect(); code.disconnect(); abort.abort(); comments.clear(); mounted.delete(root);
  }, { signal: abort.signal, once: true });
  reconcile();
}

document.addEventListener('astro:page-load', mountReaderCodeGeometry);

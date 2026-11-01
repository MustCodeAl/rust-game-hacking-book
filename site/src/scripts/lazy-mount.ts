// Runs a loader once, the first time any element matching the selector gets near the screen (or the page is printed),
// so a figure's script is only downloaded when a reader is about to reach it. Browsers without IntersectionObserver load at once.
export function mountWhenNear(selector: string, load: () => Promise<unknown>): void {
  const targets = document.querySelectorAll(selector);
  if (targets.length === 0) return;
  let loaded = false;
  const once = (): void => {
    if (loaded) return;
    loaded = true;
    observer?.disconnect();
    window.removeEventListener('beforeprint', once);
    void load();
  };
  const observer = 'IntersectionObserver' in window
    ? new IntersectionObserver((entries) => { if (entries.some((entry) => entry.isIntersecting)) once(); }, { rootMargin: '800px 0px' })
    : null;
  if (!observer) { once(); return; }
  targets.forEach((target) => observer.observe(target));
  window.addEventListener('beforeprint', once);
}

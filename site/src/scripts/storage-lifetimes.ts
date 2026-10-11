// Redraws StorageLifetimes.astro when the shared stepper (diagram-player.ts) fires "dg:step".
import { DEFAULT_STEP, lifetimeSteps } from '../lib/storage-lifetimes';
import { motionAllowed, type StepDetail } from './diagram-player';

const mounted = new WeakSet<HTMLElement>();
const WORD = { absent: 'not yet created', live: 'live', released: 'ended' } as const;

const isStepDetail = (detail: unknown): detail is StepDetail =>
  typeof detail === 'object' && detail !== null && 'index' in detail && (detail.index === null || typeof detail.index === 'number');

function mount(root: HTMLElement): void {
  if (mounted.has(root)) return;
  const steps = lifetimeSteps();
  const title = root.querySelector<HTMLElement>('[data-sl-title]');
  const caption = root.querySelector<HTMLElement>('[data-sl-caption]');
  if (!title || !caption) return;
  mounted.add(root);
  const abort = new AbortController();
  root.addEventListener('dg:step', (event: Event) => {
    if (!(event instanceof CustomEvent) || !isStepDetail(event.detail)) return;
    const index = event.detail.index;
    const step = steps[index ?? DEFAULT_STEP];
    if (!step) return;
    title.textContent = index === null ? `The moment all three exist: ${step.title.toLowerCase()}` : `Step ${index + 1} of ${steps.length}: ${step.title}`;
    caption.textContent = step.caption;
    root.querySelectorAll<HTMLElement>('[data-item]').forEach(item => {
      const id = item.dataset.item ?? '';
      const life = step.lives[id];
      if (!life) return;
      const changed = item.dataset.life !== life;
      item.dataset.life = life;
      const status = item.querySelector<HTMLElement>('[data-sl-status]');
      if (status) status.textContent = WORD[life];
      const value = item.querySelector<HTMLElement>('[data-sl-value]');
      if (value) value.textContent = step.values[id] ?? '';
      if (changed && index !== null && motionAllowed()) item.animate([{ transform: 'scale(1.03)' }, { transform: 'scale(1)' }], { duration: 380, easing: 'ease-out' });
    });
  }, { signal: abort.signal });
  document.addEventListener('astro:before-swap', () => { abort.abort(); mounted.delete(root); }, { once: true });
}

export function mountStorageLifetimes(scope: ParentNode = document): void {
  scope.querySelectorAll<HTMLElement>('[data-sl]').forEach(mount);
}
document.addEventListener('astro:page-load', () => mountStorageLifetimes());

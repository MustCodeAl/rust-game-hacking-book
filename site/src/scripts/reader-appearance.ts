type AppearanceChoice = 'original' | 'modern';

function appearanceChoice(value: string | undefined): AppearanceChoice {
  return value === 'modern' ? 'modern' : 'original';
}

function syncAppearanceControls(): void {
  const choice = appearanceChoice(document.documentElement.dataset.academyAppearance);
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-appearance-choice]')) {
    button.setAttribute('aria-pressed', String(button.dataset.appearanceChoice === choice));
  }
}

function chooseAppearance(choice: AppearanceChoice): void {
  document.documentElement.dataset.academyAppearance = choice;
  try { localStorage.setItem('gha-appearance', choice); } catch { /* Private browsing keeps the visible choice. */ }
  syncAppearanceControls();
  document.dispatchEvent(new CustomEvent('academy:reader-preference', { detail: { name: 'appearance', value: choice } }));
}

// Delegation also covers the existing phone-menu and floating-dock copies.
document.addEventListener('click', (event: MouseEvent) => {
  if (!(event.target instanceof Element)) return;
  const button = event.target.closest<HTMLButtonElement>('[data-appearance-choice]');
  if (!button || button.disabled) return;
  chooseAppearance(appearanceChoice(button.dataset.appearanceChoice));
});

new MutationObserver(syncAppearanceControls).observe(document.documentElement, {
  attributes: true, attributeFilter: ['data-academy-appearance'],
});
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', syncAppearanceControls, { once: true });
else syncAppearanceControls();
document.addEventListener('astro:page-load', syncAppearanceControls);

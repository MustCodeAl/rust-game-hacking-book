// Shared look for the native diagrams: a small colour set (hues) and line icons, so lanes, panels and cells read
// like the labelled, colour-coded reference figures instead of grey boxes. Pure data; no DOM.

export type Hue = 'blue' | 'green' | 'orange' | 'purple' | 'pink' | 'yellow' | 'teal' | 'red' | 'gray';

/** Hues handed to lanes in order when a lane does not name one. */
export const laneHues: readonly Hue[] = ['blue', 'green', 'orange', 'purple', 'pink'];

export type IconName = 'computer' | 'server' | 'cpu' | 'disk' | 'file' | 'lock' | 'gear' | 'user' | 'layers' | 'plug' | 'globe' | 'memory';

/** 24 by 24 line icons; the markup goes inside an <svg viewBox="0 0 24 24"> that strokes with currentColor. */
export const iconMarkup: Record<IconName, string> = {
  computer: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
  server: '<rect x="3" y="3" width="18" height="7" rx="1.5"/><rect x="3" y="14" width="18" height="7" rx="1.5"/><path d="M7 6.5h.01M7 17.5h.01"/>',
  cpu: '<rect x="6" y="6" width="12" height="12" rx="2"/><rect x="9.5" y="9.5" width="5" height="5"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>',
  disk: '<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
  file: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>',
  layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
  plug: '<path d="M9 3v4M15 3v4M7 7h10v5a5 5 0 01-10 0zM12 17v4"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
  memory: '<rect x="2" y="8" width="20" height="8" rx="1"/><path d="M6 12h.01M10 12h.01M14 12h.01M18 12h.01M5 16v3M9 16v3M13 16v3M17 16v3"/>',
};

const guesses: readonly [RegExp, IconName][] = [
  [/kernel|ntdll|syscall|win32|windows|\bos\b|loader|layer/i, 'layers'],
  [/cpu|processor|interrupt|keypad|hardware|chip/i, 'cpu'],
  [/lock/i, 'lock'],
  [/script|lua|dll|hook|callback|plugin|slot/i, 'plug'],
  [/disk|file|backup|folder|storage/i, 'disk'],
  [/memory|ram|heap|gold|iat|table|buffer/i, 'memory'],
  [/thread|worker|process|game|session|state/i, 'gear'],
  [/server|host|driver|resolver|origin|edge|cache|dns|service|channel/i, 'server'],
  [/user|player|reader/i, 'user'],
  [/client|device|tool|caller|injector|browser|menu|app|remover|parser|assessor/i, 'computer'],
];

/** The icon a lane gets when its data does not name one; undefined when nothing fits. */
export function guessIcon(id: string, label: string): IconName | undefined {
  const text = `${id} ${label}`;
  return guesses.find(([pattern]) => pattern.test(text))?.[1];
}

// Interactive side of ProcessThreadStepper.astro. The shared player (diagram-player.ts) owns Previous/Play/Next and fires
// "dg:step"; this script redraws the picture from the pure model that also renders the complete default view.
import { SCORE_VALUE, STEPS, hex8, sceneAt, type Registers, type Scene, type ThreadView } from '../lib/process-model';
import { motionAllowed, type StepDetail } from './diagram-player';

const mounted = new WeakSet<HTMLElement>();

const isStepDetail = (detail: unknown): detail is StepDetail =>
  typeof detail === 'object' && detail !== null && 'index' in detail && (detail.index === null || typeof detail.index === 'number');

const stateText: Record<ThreadView['state'], string> = { running: 'Running on the CPU', ready: 'Ready: waiting for a turn', absent: 'Not created yet' };
const whereText: Record<ThreadView['where'], string> = { cpu: 'In the CPU now', context: 'Saved in its thread context', none: 'Not created yet' };

function flash(element: Element | null): void {
  if (element && motionAllowed()) element.animate([{ transform: 'scale(1.03)' }, { transform: 'scale(1)' }], { duration: 420, easing: 'ease-out' });
}

/** Slide a chip carrying register values from one element to another, so a context switch visibly moves the registers. */
function fly(root: HTMLElement, from: Element | null, to: Element | null, thread: string, registers: Registers): void {
  if (!from || !to || !motionAllowed()) return;
  const area = root.getBoundingClientRect(), a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
  const chip = document.createElement('span');
  chip.className = 'pt-chip';
  chip.dataset.thread = thread;
  chip.setAttribute('aria-hidden', 'true');
  chip.textContent = `EAX ${registers.eax}, EIP ${hex8(registers.eip)}`;
  chip.style.left = `${a.left - area.left}px`;
  chip.style.top = `${a.top - area.top}px`;
  root.append(chip);
  const done = (): void => chip.remove();
  chip.animate([{ transform: 'translate(0, 0)' }, { transform: `translate(${b.left - a.left}px, ${b.top - a.top}px)` }], { duration: 900, easing: 'ease-in-out', fill: 'forwards' }).finished.then(done, done);
}

function registerText(registers: Registers): { eip: string; esp: string; eax: string } {
  return { eip: hex8(registers.eip), esp: hex8(registers.esp), eax: String(registers.eax) };
}

function mount(root: HTMLElement): void {
  if (mounted.has(root)) return;
  const title = root.querySelector<HTMLElement>('[data-pt-title]');
  const explain = root.querySelector<HTMLElement>('[data-pt-explain]');
  const file = root.querySelector<HTMLElement>('[data-pt-file]');
  const process = root.querySelector<HTMLElement>('[data-pt-process]');
  const cpu = root.querySelector<HTMLElement>('[data-pt-cpu]');
  if (!title || !explain || !file || !process || !cpu) return;
  mounted.add(root);
  const abort = new AbortController();
  const options = { signal: abort.signal };
  const cells = Array.from(root.querySelectorAll<HTMLElement>('.pt-timeline li'));
  let previous: Scene | null = null;

  const draw = (scene: Scene): void => {
    title.textContent = scene.index === null ? scene.title : `Step ${scene.index + 1} of ${STEPS.length}: ${scene.title}`;
    explain.textContent = scene.explain;
    file.dataset.lit = String(scene.fileLit);
    process.dataset.present = String(scene.processPresent);
    const score = root.querySelector<HTMLElement>('[data-pt-score]');
    if (score) score.textContent = String(scene.scoreWritten ? SCORE_VALUE : 0);
    for (const thread of scene.threads) {
      const card = root.querySelector<HTMLElement>(`.pt-thread[data-thread="${thread.id}"]`);
      if (!card) continue;
      const before = card.dataset.state;
      card.dataset.state = thread.state;
      const state = card.querySelector<HTMLElement>('[data-pt-state]');
      if (state) state.textContent = stateText[thread.state];
      const where = card.querySelector<HTMLElement>('[data-pt-where]');
      if (where) where.textContent = whereText[thread.where];
      const text = registerText(thread.registers);
      for (const name of ['eip', 'esp', 'eax'] as const) {
        const code = card.querySelector<HTMLElement>(`[data-pt-reg="${thread.id}-${name}"]`);
        if (code) code.textContent = text[name];
      }
      if (scene.index !== null && before !== thread.state) flash(card);
    }
    cells.forEach((cell, index) => { cell.dataset.state = index + 1 <= scene.tick ? 'done' : 'todo'; });
    cpu.dataset.switching = String(scene.switching);
    const head = cpu.querySelector<HTMLElement>('[data-pt-cpu-head]');
    if (head) head.textContent = scene.cpu.runner ? `The core is running thread ${scene.cpu.runner}` : 'The core is idle';
    const regs = cpu.querySelector<HTMLElement>('[data-pt-cpu-regs]');
    if (regs) {
      if (scene.cpu.registers) {
        const text = registerText(scene.cpu.registers);
        regs.replaceChildren('EIP ', code(text.eip), ', ESP ', code(text.esp), ', EAX ', code(text.eax));
      } else regs.textContent = 'No thread has registers loaded.';
    }
    const note = cpu.querySelector<HTMLElement>('[data-pt-switch]');
    if (note) note.hidden = !scene.switching;
    if (scene.index !== null && (scene.switching || previous?.cpu.runner !== scene.cpu.runner)) flash(cpu);
    if (scene.index !== null && scene.switching && scene.cpu.runner && scene.cpu.registers) {
      // The outgoing thread's registers go from the CPU to its context; the incoming thread's go from its context to the CPU.
      const incoming = scene.cpu.runner;
      const outgoing = scene.threads.find(thread => thread.id !== incoming);
      const regsOf = (id: string): Element | null => root.querySelector(`.pt-thread[data-thread="${id}"] [data-pt-where]`);
      if (outgoing) fly(root, regs, regsOf(outgoing.id), outgoing.id, outgoing.registers);
      fly(root, regsOf(incoming), regs, incoming, scene.cpu.registers);
    }
    previous = scene;
  };
  const code = (value: string): HTMLElement => { const node = document.createElement('code'); node.textContent = value; return node; };

  root.addEventListener('dg:step', (event: Event) => {
    if (!(event instanceof CustomEvent) || !isStepDetail(event.detail)) return;
    draw(sceneAt(event.detail.index));
  }, options);
  document.addEventListener('astro:before-swap', () => { abort.abort(); mounted.delete(root); }, { once: true });
}

export function mountProcessThreads(scope: ParentNode = document): void {
  scope.querySelectorAll<HTMLElement>('[data-pt]').forEach(mount);
}
document.addEventListener('astro:page-load', () => mountProcessThreads());

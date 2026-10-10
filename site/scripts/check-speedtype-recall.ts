import assert from 'node:assert/strict';
import type { Locator } from 'playwright';
type RecallKind = 'api' | 'argument' | 'import' | 'type' | 'logic';
interface RecallFragment { text: string; hint: string; mask?: string; kind?: RecallKind }
interface LexicalToken { start: number; end: number; token: string }
type TypingAuditWindow = Window & { __speedtypeSpanReads: number };
import { createRequire } from 'node:module';
import { readFile, readdir, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';


// Independent lexical oracle: inspect the ORIGINAL code, not the runtime's plan.
// It rejects a mask beginning/ending inside an identifier, literal or operator.
function lexicalTokens(source: string): LexicalToken[] {
  const result = [], operators = ['===','!==','>>=','<<=','..=','::','->','=>','>=','<=','==','!=','&&','||','+=','-=','*=','/=','%=','>>','<<','..'];
  for (let at = 0; at < source.length;) {
    const start = at, ch = source[at];
    if (/[A-Za-z_]/.test(ch)) {
      at++; while (at < source.length && /[A-Za-z0-9_]/.test(source[at])) at++;
    } else if (/[0-9]/.test(ch)) {
      at++; while (at < source.length && (/[A-Za-z0-9_]/.test(source[at]) || (source[at] === '.' && /[0-9]/.test(source[at+1] || '')))) at++;
    } else {
      const operator = operators.find(value => source.startsWith(value, at));
      if (operator) at += operator.length;
      else if (/[+*\/%<>=!&|^~?\-]/.test(ch)) at++;
      else { at++; continue; }
    }
    result.push({ start, end: at, token: source.slice(start, at) });
  }
  return result;
}
function fitsFocus(kind: RecallKind | undefined, focus: string) {
  if (focus === 'calls') return kind === 'api' || kind === 'argument';
  if (focus === 'imports') return kind === 'import' || kind === 'type';
  return focus === 'mixed' || (kind || 'logic') === 'logic';
}
function explicitCandidates(source: string, fragments: RecallFragment[], focus: string) {
  const tokens = lexicalTokens(source), matches = [];
  for (const fragment of fragments) {
    if (!fragment.mask || !fitsFocus(fragment.kind, focus)) continue;
    for (let start = source.indexOf(fragment.text); start !== -1; start = source.indexOf(fragment.text, start + Math.max(1, fragment.text.length))) {
      matches.push(...tokens.filter(token => token.token === fragment.mask && token.start >= start && token.end <= start + fragment.text.length).map(token => ({ ...token, kind: fragment.kind })));
    }
  }
  return matches;
}
async function inspectMasks(panel: Locator, source: string, fragments: RecallFragment[], id: string) {
  const flags = await panel.locator('.st-c').evaluateAll(nodes => nodes.map(node => node.hasAttribute('data-recall-hidden')));
  const chars = Array.from(source), offsets = [];
  let offset = 0;
  for (const ch of chars) { offsets.push(offset); offset += ch.length; }
  assert.equal(flags.length, chars.length, `${id}: span sequence preserves all original code points`);
  const gaps = [];
  for (let i = 0; i < flags.length;) {
    if (!flags[i]) { i++; continue; }
    const begin = i;
    while (i < flags.length && flags[i]) i++;
    const start = offsets[begin], end = offsets[i] ?? source.length;
    gaps.push({ start, end, token: source.slice(start, end) });
  }
  const tokens = lexicalTokens(source), total = (source.match(/[!-~]/g) || []).length;
  const hidden = gaps.reduce((sum, gap) => sum + gap.token.length, 0), budget = Math.floor(total * 0.15);
  assert.ok(gaps.length > 0 && gaps.length <= 3, `${id}: one to three sparse gaps`);
  for (const gap of gaps) assert.ok(tokens.some(token => token.start === gap.start && token.end === gap.end), `${id}: complete token ${JSON.stringify(gap.token)}, never middle letters`);
  for (let i = 1; i < gaps.length; i++) assert.ok(gaps[i].start - gaps[i-1].end >= 8, `${id}: gaps separated by at least eight source characters`);
  const focus = await panel.getAttribute('data-speedtype-focus') || 'mixed';
  const eligible = explicitCandidates(source, fragments, focus);
  for (const gap of gaps) {
    if (fragments.every(fragment => fragment.mask)) assert.ok(eligible.some(candidate => candidate.start === gap.start && candidate.end === gap.end), `${id}: target belongs to an authored fragment and selected focus`);
  }
  if (hidden > budget) {
    assert.equal(gaps.length, 1, `${id}: budget exception is one indivisible token`);
    assert.ok(hidden <= total * 0.25, `${id}: at least75% of nonspace code remains visible`);
    if (fragments.every(fragment => fragment.mask)) assert.ok(!eligible.some(candidate => candidate.token.length <= budget), `${id}:15% used whenever an authored complete token fits`);
    assert.notEqual(await panel.getAttribute('data-speedtype-budget-exception'), null);
  } else assert.equal(await panel.getAttribute('data-speedtype-budget-exception'), null);
  return { hidden, total, gaps, focus };
}
async function readableMask(panel: Locator): Promise<string> {
  await panel.evaluate(async root => {
    await new Promise<number>(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const readable = root.querySelector('[data-speedtype-readable]');
    const visible = root.querySelector('.kit-speedtype__code code');
    if (readable?.textContent?.trim() !== visible?.textContent?.trim()) throw new Error('Assistive and visible masks differ');
  });
  const text = await panel.locator('[data-speedtype-readable]').textContent();
  assert.notEqual(text, null, 'Readable practice copy exists');
  return text!;
}

const require = createRequire(import.meta.url);
const { chromium }: typeof import('playwright') = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const site = fileURLToPath(new URL('../', import.meta.url));
const lessons = [];
let authored = 0;
for (const folder of await readdir(resolve(site, 'src/content/docs/pages'))) {
  if (!/^\d+$/.test(folder)) continue;
  for (const name of await readdir(resolve(site, 'src/content/docs/pages', folder))) {
    if (!name.endsWith('.mdx')) continue;
    const source = await readFile(resolve(site, 'src/content/docs/pages', folder, name), 'utf8');
    const count = (source.match(/<SpeedType\b/g) || []).length;
    if (count) lessons.push({ path: `${folder}/${name.slice(0, -4)}`, count });
    authored += count;
  }
}
const base = (process.env.BOOK_BASE_URL || 'http://127.0.0.1:8766/rust-game-hacking-book/').replace(/\/?$/, '/');
const output = process.env.QA_OUTPUT;
if (output) await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
let groups = 0, actions = 0, masks = 0, profileGroups = 0;
try {
  for (const width of [420, 1280]) {
    const context = await browser.newContext({ viewport: { width, height: 950 } });
    await context.route('**/*', route => new URL(route.request().url()).origin === new URL(base).origin ? route.continue() : route.abort());
    await context.addInitScript(() => {
      // A regression to rebuilding the assistive copy from all spans on each key
      // produces many getter reads; the cached buffer needs at most the changed gap.
      const auditWindow = window as unknown as TypingAuditWindow;
      auditWindow.__speedtypeSpanReads = 0;
      const descriptor = Object.getOwnPropertyDescriptor(Node.prototype, 'textContent');
      if (descriptor?.get && descriptor.set) {
        const getText = descriptor.get as (this: Node) => string | null;
        const setText = descriptor.set as (this: Node, value: string | null) => void;
        Object.defineProperty(Node.prototype, 'textContent', {
        configurable: descriptor.configurable, enumerable: descriptor.enumerable,
        get(this: Node) {
          if (document.documentElement?.dataset.typing === 'true' && this instanceof Element && this.classList.contains('st-c')) auditWindow.__speedtypeSpanReads++;
          return getText.call(this);
        },
        set(this: Node, value: string | null) { setText.call(this, value); },
      });
      }
    });
    const page = await context.newPage();
    page.setDefaultTimeout(12000);
    for (const lesson of lessons) {
      const errors: string[] = [], onError = (error: Error) => errors.push(error.message);
      page.on('pageerror', onError);
      const response = await page.goto(`${base}pages/${lesson.path}/`, { waitUntil: 'domcontentloaded' });
      assert.ok(response, lesson.path + ' returned a response');
      assert.equal(response.status(), 200);
      const roots = page.locator('[data-speedtype]');
      assert.equal(await roots.count(), lesson.count);
      for (let i = 0; i < lesson.count; i++) {
        const root = roots.nth(i), id = await root.getAttribute('data-speedtype-id');
        assert.ok(id, 'Drill has a stable ID');
        const fragments: RecallFragment[] = JSON.parse(await root.getAttribute('data-speedtype-recall') || '[]');
        assert.ok(fragments.length >= 2, `${id}: names/logic must be authored for recall`);
        const original = root.locator(':scope > .expressive-code');
        const lines = await original.locator('.ec-line .code').allTextContents();
        const source = lines.map(line => /^\s*$/.test(line) ? '' : line).join('\n');
        const typeable = lines.map(line => Array.from(/^\s*$/.test(line) ? '' : line.replace(/^[ \t]+|[ \t]+$/g, '')).filter(ch => ch === '\t' || (ch >= ' ' && ch <= '~')).join('')).join('\n');
        for (const fragment of fragments) assert.ok(source.includes(fragment.text), `${id}: an actual code fragment is hidden`);
        const primary = root.locator('.kit-speedtype__start').first();
        assert.equal(await primary.getAttribute('data-speedtype-start'), 'recall');
        const copySeed = JSON.stringify({ wpm: 31, acc: 97 });
        await page.evaluate(({ id, seed }) => {
          localStorage.setItem(`gha-speedtype-${id}`, seed);
          localStorage.removeItem(`gha-speedtype-${id}:recall`);
        }, { id, seed: copySeed });
        await primary.click(); actions++;
        const panel = root.locator('[data-speedtype-active]'), input = panel.locator('textarea');
        const typeLines = async (text: string) => {
          const rows = text.split('\n');
          for (let row = 0; row < rows.length; row++) {
            if (row) { await input.press('Enter'); actions++; }
            if (rows[row]) { await page.keyboard.insertText(rows[row]); actions++; }
          }
        };
        assert.equal(await panel.getAttribute('data-speedtype-mode'), 'recall');
        assert.equal(await original.isVisible(), false, `${id}: complete source is hidden during practice`);
        let masked = await readableMask(panel);
        const initialMasks = await inspectMasks(panel, source, fragments, id);
        const visibleMasked = await panel.locator('.kit-speedtype__code code').textContent();
        assert.ok(visibleMasked);
        assert.equal(masked.trim(), visibleMasked.trim());
        const hidden = panel.locator('[data-recall-hidden]');
        assert.ok(await hidden.count() > 0); masks += await hidden.count();
        assert.equal(await page.evaluate(() => document.documentElement.dataset.typing), 'true', 'Whole-page typing pause is active');
        const first = typeable[0];
        await input.press(first === 'x' ? 'z' : 'x'); actions++;
        assert.match(await panel.locator('.kit-speedtype__stats').innerText(), /1 mistakes/);
        assert.equal(await panel.locator('[data-speedtype-readable]').textContent(), masked, 'Wrong key does not expose an answer');
        const prefix = await panel.locator('.st-c').evaluateAll(nodes => {
          const end = nodes.findIndex(node => node.hasAttribute('data-recall-hidden'));
          return nodes.slice(0, end).filter(node => node.dataset.s !== 'ok').map(node => node.classList.contains('st-nl') ? '\n' : node.textContent).join('');
        });
        const firstHidden = await panel.locator('[data-recall-hidden]').first().evaluate(node => {
          const code = node.closest('.kit-speedtype__code');
          if (!code) throw new Error('Practice character has no code container');
          const all = [...code.querySelectorAll('.st-c')];
          return all.indexOf(node);
        });
        // The independent unmasked line sequence includes the same automatic
        // indentation; choose the next character by its original source offset.
        const sequenceSource = lines.map(line => /^\s*$/.test(line) ? '' : line).join('\n');
        const correct = Array.from(sequenceSource)[firstHidden];
        const readsBefore = await page.evaluate(() => (window as unknown as TypingAuditWindow).__speedtypeSpanReads);
        await typeLines(prefix + correct);
        const readsAfter = await page.evaluate(() => (window as unknown as TypingAuditWindow).__speedtypeSpanReads);
        assert.ok(readsAfter - readsBefore <= 3, `${id}: cached readable buffer avoids full-span scans on typing`);
        assert.equal(await panel.locator('.st-c').nth(firstHidden).getAttribute('data-recall-hidden'), null, 'A correct hidden character becomes visible');
        await input.press('Backspace'); actions++;
        assert.equal(await panel.locator('.st-c').nth(firstHidden).getAttribute('data-recall-hidden'), '', 'Backspace restores the blank');
        await panel.getByRole('button', { name: 'Start over', exact: true }).click(); actions++;
        masked = await readableMask(panel);
        const rotatedMasks = await inspectMasks(panel, source, fragments, id);
        if (output) await root.screenshot({ path: `${output}/masked-${width}-${id}.png` });

        const authoredKinds = new Set(fragments.map(fragment => fragment.kind).filter(Boolean));
        const expectedFocus = ['mixed'];
        if (authoredKinds.has('api') || authoredKinds.has('argument')) expectedFocus.push('calls');
        if (authoredKinds.has('import') || authoredKinds.has('type')) expectedFocus.push('imports');
        if (authoredKinds.has('logic')) expectedFocus.push('logic');
        const chooser = panel.getByRole('combobox', { name: 'Practice focus', exact: true });
        assert.equal(await chooser.count(), expectedFocus.length > 1 ? 1 : 0, `${id}: focus exists only for authored kinds`);
        if (expectedFocus.length > 1) {
          assert.deepEqual(await chooser.locator('option').evaluateAll(options => options.map(option => (option as HTMLOptionElement).value)), expectedFocus);
          for (const focus of [...expectedFocus.slice(1), 'mixed']) {
            await chooser.selectOption(focus); actions++;
            assert.equal(await panel.getAttribute('data-speedtype-focus'), focus);
            await readableMask(panel);
            const focused = await inspectMasks(panel, source, fragments, id);
            if (id === 'win32-open-process-contract' && focus === 'calls') {
              const call = source.indexOf('OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid)');
              assert.ok(focused.gaps.some(gap => gap.start === call && gap.token === 'OpenProcess'), 'The actual OpenProcess call is hidden as one complete11-character token');
              assert.ok(focused.gaps.some(gap => gap.token === 'false'), 'The complete inheritance argument is a target');
            }
            if (id === 'win32-open-process-contract' && focus === 'imports') {
              const matched = explicitCandidates(source, fragments, focus).filter(candidate => focused.gaps.some(gap => gap.start === candidate.start && gap.end === candidate.end));
              assert.ok(matched.some(candidate => candidate.kind === 'import'), 'A complete import member is targeted');
              assert.ok(matched.some(candidate => candidate.kind === 'type'), 'A complete handle/PID type is targeted');
            }
          }
          if (id === 'win32-open-process-contract' || id === 'win32-export-lookup') {
            assert.notDeepEqual(rotatedMasks.gaps, initialMasks.gaps, `${id}: first reset rotates useful eligible targets`);
            const baseline = await readableMask(panel), seen = new Set([baseline]);
            for (let turn = 0; turn < fragments.length; turn++) {
              await panel.getByRole('button', { name: 'Start over', exact: true }).click(); actions++;
              await inspectMasks(panel, source, fragments, id);
              seen.add(await readableMask(panel));
            }
            assert.ok(seen.size > 1, `${id}: rotation reaches another authored target set`);
            assert.equal(await readableMask(panel), baseline, `${id}: deterministic cycle returns to its initial targets`);
            profileGroups++;
          }
          masked = await readableMask(panel);
        }

        await panel.getByRole('button', { name: 'Hint', exact: true }).click(); actions++;
        assert.match(await panel.locator('.kit-speedtype__clue').innerText(), /^Hint:/);
        assert.match(await panel.locator('.kit-speedtype__mode').innerText(), /Assisted/);
        await panel.getByRole('button', { name: 'Show hidden code', exact: true }).click(); actions++;
        for (const fragment of fragments) assert.ok((await panel.locator('[data-speedtype-readable]').textContent() ?? '').includes(fragment.text), `${id}: missing visible fragment ${JSON.stringify(fragment.text)}`);
        await panel.getByRole('button', { name: 'Hide answers', exact: true }).click(); actions++;
        assert.equal(await panel.locator('[data-speedtype-readable]').textContent(), masked);
        await input.focus(); await typeLines(typeable);
        assert.equal(await panel.getAttribute('data-done'), 'true', `${id}: a correct complete snippet finishes`);
        assert.match(await panel.locator('.kit-speedtype__result').innerText(), /assisted/);
        assert.equal(await page.evaluate(id => localStorage.getItem(`gha-speedtype-${id}:recall`), id), null, 'Assistance cannot replace an unaided best');
        await panel.getByRole('button', { name: 'Start over', exact: true }).click(); actions++;
        await input.focus(); await typeLines(typeable);
        assert.equal(await panel.getAttribute('data-done'), 'true');
        assert.ok(await page.evaluate(id => localStorage.getItem(`gha-speedtype-${id}:recall`), id));
        assert.equal(await page.evaluate(id => localStorage.getItem(`gha-speedtype-${id}`), id), copySeed, 'The older copy record remains intact');
        await input.press('Escape'); actions++;
        assert.equal(await primary.evaluate(node => node === document.activeElement), true);
        assert.equal(await original.isVisible(), true);
        await root.getByRole('button', { name: 'Copy visible code', exact: true }).click(); actions++;
        assert.equal(await panel.getAttribute('data-speedtype-mode'), 'copy');
        for (const fragment of fragments) assert.ok((await panel.locator('[data-speedtype-readable]').textContent() ?? '').includes(fragment.text), `${id}: missing visible fragment ${JSON.stringify(fragment.text)}`);
        await input.press('Escape'); actions++;
        assert.notEqual(await page.evaluate(() => document.documentElement.dataset.typing), 'true', 'Closing releases the whole-page typing pause');
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${width}/${id}: overflow`);
        assert.deepEqual(errors, [], `${width}/${id}: page error`);
        groups++;
      }
      page.off('pageerror', onError);
    }
    await context.close();
  }
  assert.equal(groups, authored * 2);
  assert.equal(profileGroups, 4, 'Both real API profiles checked at phone and desktop widths');
  const noScript = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 420, height: 950 } });
  const offline = await noScript.newPage();
  for (const [path, id, api] of [['10/03','win32-open-process-contract','OpenProcess'], ['10/07','win32-export-lookup','GetProcAddress']]) {
    await offline.goto(`${base}pages/${path}/`, { waitUntil: 'domcontentloaded' });
    const root = offline.locator(`[data-speedtype-id="${id}"]`);
    assert.ok((await root.locator('.expressive-code .ec-line .code').allTextContents()).join('\n').includes(api), `${id}: no-script source remains complete`);
    assert.equal(await root.locator('[data-recall-hidden], [data-speedtype-active]').count(), 0);
  }
  await noScript.close();
  console.log(`speedtype-recall: all ${authored} snippets start masked; ${groups} phone/desktop groups, ${actions} actual controls/typing actions, ${masks} masked character observations. Complete-token masks, preferred15%/single25%budget,8-character separation, API focus/rotation, cached readable buffer, no-script source, hints, reveal, correction, completion, focus return and separate saved records pass; no page errors or overflow.`);
} finally { await browser.close(); }

// Draws a scene as SVG markup at any moment. The page gets the finished picture
// from this at build time (so print, search, and a browser without scripts all
// show something meaningful); scene-runtime.js then moves the same elements.
import { ROLES, format, stateAt, transformOf } from './engine.mjs';

const escape = (text) => String(text).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const round = (n) => String(Math.round(n * 100) / 100);

/** The marker (arrowhead) definitions: one per colour role, so a head matches its line. */
function defs(id) {
	const heads = ROLES
		.map((role) =>`<marker id="${id}-head-${role}" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="8" markerHeight="8" markerUnits="userSpaceOnUse" orient="auto-start-reverse"><path class="scene__tip" ${role === 'plain' ? '' : `data-role="${role}" `}d="M0 0L10 5L0 10z"/></marker>`)
		.join('');
	return `<defs>${heads}</defs>`;
}

function lines(p, className) {
	const text = p.num !== undefined ? format(p.num, p.fmt) : p.text ?? p.t;
	const size = p.size ? ` font-size="${p.size}"` : '';
	const weight = p.weight ? ` font-weight="${p.weight}"` : '';
	const anchor = p.anchor ? ` text-anchor="${p.anchor}"` : '';
	const attrs = `${anchor}${size}${weight}`;
	if (Array.isArray(text)) {
		const lead = p.lead ?? 1.35;
		const spans = text.map((line, i) => `<tspan x="0"${i ? ` dy="${lead}em"` : ''}>${escape(line)}</tspan>`).join('');
		return `<text class="${className}"${attrs}>${spans}</text>`;
	}
	return `<text class="${className}"${attrs}>${escape(text)}</text>`;
}

function actorMarkup(a, state, ctx) {
	const p = { ...a, ...(a.id ? state[a.id] : null) };
	const attrs = [];
	if (a.id) attrs.push(`data-a="${escape(a.id)}"`);
	if (p.role) attrs.push(`data-role="${p.role}"`);
	if (a.cls) attrs.push(`class="${escape(a.cls)}"`);
	attrs.push(`transform="${transformOf(p)}"`);
	if (p.o !== undefined && p.o !== 1) attrs.push(`opacity="${round(p.o)}"`);
	const mono = p.mono ? ' scene__mono' : '';
	let inner = '';
	switch (a.k) {
		case 'g':
			inner = (a.kids || []).map((kid) => actorMarkup(kid, state, ctx)).join('');
			break;
		case 'rect':
			inner = `<rect class="scene__rect${a.look ? ` scene__rect--${a.look}` : ''}" width="${round(p.w)}" height="${round(p.h)}" rx="${a.r ?? 6}"/>`;
			break;
		case 'cell':
			inner =
				`<rect class="scene__rect${a.look ? ` scene__rect--${a.look}` : ''}" width="${round(p.w)}" height="${round(p.h)}" rx="${a.r ?? 5}"/>` +
				`<text class="scene__label scene__mid${mono}" x="${round(p.w / 2)}" y="${round(p.h / 2)}" dy=".35em" text-anchor="middle"${p.size ? ` font-size="${p.size}"` : ''}${p.weight ? ` font-weight="${p.weight}"` : ''}>${escape(p.num !== undefined ? format(p.num, p.fmt) : p.text ?? p.t)}</text>`;
			break;
		case 'text':
			inner = lines(p, `scene__label scene__free${mono}`);
			break;
		case 'circle':
			inner = `<circle class="scene__rect${a.look ? ` scene__rect--${a.look}` : ''}" r="${a.r}"/>`;
			break;
		case 'poly':
			inner = `<polygon class="scene__rect${a.look ? ` scene__rect--${a.look}` : ''}" points="${a.pts.map(([x, y]) => `${round(x)},${round(y)}`).join(' ')}"/>`;
			break;
		case 'image':
			inner = `<image href="${escape(ctx.base + a.src)}" width="${round(p.w)}" height="${round(p.h)}" preserveAspectRatio="xMidYMid meet"/>`;
			break;
		case 'line':
		case 'path': {
			const d = a.k === 'line' ? `M0 0L${round(a.x2 - a.x)} ${round(a.y2 - a.y)}` : a.d;
			const drawn = p.draw;
			const full = drawn === undefined || drawn >= 0.999;
			const dash = a.dash ? ' stroke-dasharray="5 4"' : drawn !== undefined ? ` stroke-dasharray="1" stroke-dashoffset="${round(1 - drawn)}"` : '';
			const head = a.arrow && full ? ` marker-end="url(#${ctx.id}-head-${p.role || 'plain'})"` : '';
			// A class rule beats a presentation attribute, so a custom width is an inline style.
			const width = a.width ? ` style="stroke-width:${a.width}px"` : '';
			const shape = a.fill ? ' scene__rect' : '';
			inner = `<path class="scene__line${shape}"${a.arrow ? ' data-arrow="1"' : ''} d="${d}"${drawn !== undefined ? ' pathLength="1"' : ''}${dash}${head}${width}/>`;
			break;
		}
		default:
			throw new Error(`Unknown actor kind ${a.k}`);
	}
	return `<g ${attrs.join(' ')}>${inner}</g>`;
}

/** The inside of the scene's <svg>, as it looks at time `t`. */
export function renderScene(sc, t, ctx) {
	const state = stateAt(sc, t);
	return defs(ctx.id) + sc.actors.map((actor) => actorMarkup(actor, state, ctx)).join('');
}

/** Colours for drawing a still frame outside the site, such as for a contact sheet. */
export const PREVIEW_CSS = `
.scene__svg{font-family:Helvetica,Arial,sans-serif}
.scene__mono{font-family:Menlo,monospace}
g[data-role=input],g[data-role=state]{--r:#2f6fb5}
g[data-role=process]{--r:#a8447a}
g[data-role=output]{--r:#1c8a78}
g[data-role=caution]{--r:#b4730a}
g[data-role=muted]{--r:#76808c}
marker [data-role=input],marker [data-role=state]{--r:#2f6fb5}
marker [data-role=process]{--r:#a8447a}
marker [data-role=output]{--r:#1c8a78}
marker [data-role=caution]{--r:#b4730a}
marker [data-role=muted]{--r:#76808c}
.scene__rect{fill:color-mix(in srgb,var(--r,#59636f) 11%,#fff);stroke:var(--r,#59636f);stroke-width:1.5}
.scene__rect--ghost{fill:none;stroke-dasharray:4 3}
.scene__rect--plain{fill:#fff}
.scene__label{fill:#11151a;font-size:15px}
.scene__free[data-role]{fill:var(--r)}
g[data-role] > .scene__free{fill:var(--r)}
.scene__line{fill:none;stroke:var(--r,#59636f);stroke-width:2}
.scene__line.scene__rect{fill:color-mix(in srgb,var(--r,#59636f) 11%,#fff)}
.scene__tip{fill:var(--r,#59636f)}
`;

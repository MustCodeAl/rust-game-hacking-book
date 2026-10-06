// Contrast audit: text vs effective background on two lessons in all 5 palettes x light/dark. Needs dist served on :8766 (python3 scripts/serve-dist.py 8766)
// and Playwright at /opt/node22/lib/node_modules/playwright. Prints only failing combinations (WCAG AA: 4.5, or 3 for large text). Ignores images and gradients.
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const pages=['pages/1/05/','pages/3/02/'];
for (const pal of ['paper','purple','midnight','forest','contrast']) for (const mode of ['light','dark']) {
  const ctx=await b.newContext({viewport:{width:1280,height:900}});const p=await ctx.newPage();
  await p.addInitScript(([pal,mode])=>{try{localStorage.clear();localStorage.setItem('gha-theme',pal);localStorage.setItem('gha-mode',mode);localStorage.setItem('starlight-theme',mode)}catch(e){}},[pal,mode]);
  const agg={};let total=0;
  for (const u of pages){
    await p.goto('http://localhost:8766/rust-game-hacking-book/'+u,{waitUntil:'load'});await p.waitForTimeout(600);
    const res=await p.evaluate(()=>{
      const parse=c=>{const m=c.match(/rgba?\(([^)]+)\)/);if(m){const a=m[1].split(/[ ,\/]+/).map(Number);return [a[0],a[1],a[2],a[3]==null?1:a[3]]}
        const m2=c.match(/color\(srgb ([^)]+)\)/);if(m2){const a=m2[1].split(/[ \/]+/).map(Number);return [a[0]*255,a[1]*255,a[2]*255,a[3]==null?1:a[3]]}return null};
      const lum=([r,g,b])=>{const f=v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)};return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b)};
      const over=(fg,bg)=>[fg[0]*fg[3]+bg[0]*(1-fg[3]),fg[1]*fg[3]+bg[1]*(1-fg[3]),fg[2]*fg[3]+bg[2]*(1-fg[3]),1];
      const bgOf=el=>{const layers=[];for(let e=el;e;e=e.parentElement){const c=parse(getComputedStyle(e).backgroundColor);if(c&&c[3]>0){layers.push(c);if(c[3]>=1)break}}
        let base=[255,255,255,1];for(let i=layers.length-1;i>=0;i--)base=over(layers[i],base);return base};
      const out=[];const seen=new Set();
      const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
      let n;while(n=w.nextNode()){const t=n.nodeValue.trim();if(t.length<2)continue;const el=n.parentElement;if(!el||seen.has(el))continue;seen.add(el);
        const cs=getComputedStyle(el);if(cs.visibility==='hidden'||cs.display==='none'||+cs.opacity===0)continue;const r=el.getBoundingClientRect();if(r.width<2||r.height<2||r.bottom<0||r.top>document.documentElement.scrollHeight)continue;
        if(el.closest('svg,[aria-hidden="true"],.sr-only,script,style,.mermaid,.katex')) continue;
        const fg=parse(cs.color);if(!fg)continue;const bg=bgOf(el);const f=over(fg,bg);const L1=lum(f),L2=lum(bg);const ratio=(Math.max(L1,L2)+0.05)/(Math.min(L1,L2)+0.05);
        const size=parseFloat(cs.fontSize),bold=+cs.fontWeight>=700;const need=(size>=24||(size>=18.66&&bold))?3:4.5;
        if(ratio<need)out.push({sel:(el.tagName.toLowerCase()+'.'+(el.className&&el.className.baseVal===undefined?el.className:'').toString().split(' ').filter(Boolean).slice(0,2).join('.')),ratio:+ratio.toFixed(2),need,txt:t.slice(0,24)})}
      return out});
    total+=res.length;for(const r of res){const k=r.sel;if(!agg[k]||r.ratio<agg[k].ratio)agg[k]={...r,n:(agg[k]?agg[k].n:0)+1};else agg[k].n++}
  }
  const worst=Object.values(agg).sort((a,b)=>a.ratio-b.ratio).slice(0,5).map(r=>`${r.sel} ${r.ratio}<${r.need} x${r.n} "${r.txt}"`);
  console.log(pal,mode,'fails',total,'|',worst.join(' ; '));
  await ctx.close();
}
await b.close();

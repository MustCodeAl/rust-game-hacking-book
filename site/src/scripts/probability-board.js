// Counts are measured membership in a toy sample, not independent detector rates.
export function vennCountsModel({ aOnly, both, bOnly, neither }) {
  const total = aOnly + both + bOnly + neither;
  const a = aOnly + both, b = bOnly + both, either = aOnly + both + bOnly;
  return { total, a, b, both, either, neither,
    pA: total ? a / total : null, pB: total ? b / total : null,
    pBoth: total ? both / total : null, pEither: total ? either / total : null,
    pBgivenA: a ? both / a : null };
}

export function probabilityBoard(root, { el, header, slider, presets }) {
  header(root, 'Explore it', 'Two signals can overlap',
    'Change the four measured region counts. A case flagged by both checks belongs to both sets but is still one case. These invented signals do not establish cheating.');
  const initial = { aOnly: 4, both: 2, bOnly: 3, neither: 11 };
  const fields = Object.entries({aOnly:'Signal A only', both:'Both signals', bOnly:'Signal B only', neither:'Neither signal'}).map(([id,label]) => ({id, ...slider(`${root.id}-${id}`, label, 0, 20, 1, initial[id], v => `${v} cases`)}));
  const controls = el('div','sim-lab__controls'); controls.append(...fields.map(f=>f.wrap));
  const ns='http://www.w3.org/2000/svg';
  const shape=(tag,attrs,words)=>{const n=document.createElementNS(ns,tag);for(const [key,value]of Object.entries(attrs))n.setAttribute(key,value);if(words!==undefined)n.textContent=words;return n;};
  const drawing=shape('svg',{viewBox:'0 0 480 230',role:'img','aria-label':'A and B overlap; each of the four membership regions has its own count.'});
  drawing.style.width='100%';drawing.style.height='auto';drawing.style.fontSize='1rem';drawing.style.color='var(--ink)';
  drawing.append(shape('rect',{x:8,y:8,width:464,height:214,rx:8,fill:'var(--paper)',stroke:'var(--line)'}),
    shape('circle',{cx:180,cy:109,r:78,fill:'none',stroke:'var(--chapter-accent)'}),
    shape('circle',{cx:290,cy:109,r:78,fill:'none',stroke:'var(--rust)'}));
  const labels={};
  for(const [key,x,y]of [['aOnly',144,116],['both',235,116],['bOnly',325,116],['neither',415,205]]){
    labels[key]=shape('text',{x,y,fill:'currentColor','text-anchor':'middle'});drawing.append(labels[key]);
  }
  drawing.append(shape('text',{x:136,y:28,fill:'currentColor'},'A'),shape('text',{x:323,y:28,fill:'currentColor'},'B'),shape('text',{x:321,y:205,fill:'currentColor'},'Neither:'));
  const legend=el('p','concept-lab__result-note','Shapes show membership, not proportional area. Each count is also named in a slider above.');
  const cards=el('div','sim-lab__cards'),explain=el('p','sim-lab__explain');explain.setAttribute('aria-live','polite');
  const apply=item=>{for(const f of fields){f.input.value=item[f.id];f.update();}render();};
  root.append(controls,presets([
    {label:'Reset to the worked example',...initial},
    {label:'Same six cases in both sets',aOnly:0,both:6,bOnly:0,neither:14},
    {label:'Sets do not overlap',aOnly:6,both:0,bOnly:6,neither:8},
    {label:'No observations yet',aOnly:0,both:0,bOnly:0,neither:0},
  ],apply),drawing,legend,cards,explain);
  function render(){
    const values=Object.fromEntries(fields.map(f=>[f.id,Number(f.input.value)]));const m=vennCountsModel(values);
    for(const f of fields)labels[f.id].textContent=values[f.id];
    const rate=(count,denominator)=>denominator?`${count}/${denominator} = ${(100*count/denominator).toFixed(1)}%`:'Undefined (no cases in the denominator)';
    cards.replaceChildren(...[
      ['P(A)',rate(m.a,m.total),'A only + both'],
      ['P(B)',rate(m.b,m.total),'B only + both'],
      ['P(A and B)',rate(m.both,m.total),'the overlap once'],
      ['P(A or B)',rate(m.either,m.total),'A + B − overlap'],
      ['P(B given A)',rate(m.both,m.a),'among cases already in A'],
    ].map(([label,value,note])=>{const card=el('div','concept-lab__result-card');card.append(el('span','concept-lab__result-label',label),el('strong','concept-lab__result-value',value),el('small','concept-lab__result-note',note));return card;}));
    explain.textContent=m.total?`${m.total} distinct cases: ${m.a} in A + ${m.b} in B − ${m.both} counted twice = ${m.either} in at least one set. The overlap is measured here. Multiplying marginal probabilities would require an independence assumption; two checks can share a cause. The remaining ${m.neither} cases are in neither set.`:'With no observations, all sample probabilities are undefined. Zero observed cases is not evidence that an event is impossible.';
  }
  for(const f of fields)f.input.addEventListener('input',render);render();
}

import assert from 'node:assert/strict';
import { RUST_IDIOM_TRACES } from '../src/scripts/rust-idiom-traces.js';
const initial=t=>Object.fromEntries(t.inputs.map(i=>[i.id,i.value]));
const end=(name,values={})=>{const t=RUST_IDIOM_TRACES['idiom-'+name];return t.run({...initial(t),...values}).at(-1).vars;};
let cases=0;
for(const [key,t]of Object.entries(RUST_IDIOM_TRACES)){
 const values=t.inputs.reduce((sets,i)=>sets.flatMap(v=>(i.type==='select'?i.options.map(o=>o.value):[...new Set([i.min,i.value,i.max])]).map(n=>({...v,[i.id]:n}))),[{}]);
 for(const v of values){const steps=t.run(v);cases++;assert.deepEqual(steps,t.run(v));assert(steps.length>0);for(const s of steps){assert(Number.isInteger(s.line)&&s.line>=0&&s.line<t.code.length,key);for(const value of Object.values(s.vars))if(typeof value==='number')assert(Number.isFinite(value),key);}}
}
assert.equal(end('option-chain').result,'Ok(4)');
assert.equal(end('option-chain',{slot:1,budget:16}).result,'Ok(0)');
assert.equal(end('option-chain',{slot:4}).price,'None');
assert.equal(end('result-chain',{text:'oops'}).result,'Err(bad cost)');
assert.equal(end('result-chain',{text:'20',gold:12}).result,'Err(not enough gold)');
assert.equal(end('result-combinators',{value:128}).small,'Err(score too large)');
assert.equal(end('result-combinators',{ok:'no'}).small,'Err(read failed)');
assert.equal(end('state-enum',{ticks:1}).next,'Ready');
assert.equal(end('state-enum',{ticks:3}).next,'Cooling { ticks: 2 }');
assert.equal(end('patterns',{present:'no'}).result,'no player');
assert.equal(end('patterns',{health:0}).result,'respawn');
assert.equal(end('patterns',{health:24}).result,'heal');
assert.equal(end('patterns',{health:25}).result,'wait');
assert.equal(end('filter-map-fold').total,22);
assert.equal(end('filter-map-fold',{budget:0}).total,0);
assert.equal(end('windows',{middle:3}).deltas,'[1, 7]');
assert.equal(end('chunks',{tail:'yes'}).result,'Err(partial record)');
assert.equal(end('byte-conversion',{length:'3'}).decoded,'None');
assert.equal(end('byte-conversion',{gold:300}).encoded,'2C 01 00 00');
for(let start=0;start<=255;start++)for(let gain=0;gain<=20;gain++){
 const v=end('integer-safety',{start,gain});cases++;
 assert.equal(v.checked,start+gain<=255?`Some(${start+gain})`:'None');
 assert.equal(v.wrapping,(start+gain)&255);assert.equal(v.saturating,Math.min(255,start+gain));
}
assert.equal(end('layout').gold_offset,4);assert.equal(end('layout').size,12);
assert.equal(end('borrowed-slice',{count:0}).view,'Some(&[])');
assert.equal(end('borrowed-slice',{count:6}).view,'None');
assert.equal(end('borrowed-slice').copied_bytes,0);
assert.equal(end('newtype-display').label,'RVA 0x200');
assert.equal(end('newtype-display').validated,false);
assert.equal(end('trait-reader',{reader:'missing',price:0}).affordable,false);
assert.equal(end('trait-reader',{price:20}).affordable,true);
assert.equal(end('trait-reader',{price:21}).affordable,false);
assert.equal(end('builder',{limit:0}).validated,false);
for(const stop of ['yes','no']){assert.equal(end('drop-guard',{stop}).byte,75);assert.equal(end('drop-guard',{stop}).guard,'dropped');}
assert(end('error-layers',{text:'oops'}).library.includes('Parse'));
assert(end('error-layers',{text:'80'}).library.includes('TooLarge'));
console.log(`${Object.keys(RUST_IDIOM_TRACES).length} Rust idiom models: ${cases} branch/boundary cases and independent semantic assertions passed.`);

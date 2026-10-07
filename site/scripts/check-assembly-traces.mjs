import assert from 'node:assert/strict';
import { ASSEMBLY_TRACES } from '../src/scripts/assembly-traces.js';
const initial=t=>Object.fromEntries(t.inputs.map(i=>[i.id,i.value]));
const run=(name,v={})=>{const t=ASSEMBLY_TRACES['asm-'+name];return t.run({...initial(t),...v});};
const end=(name,v={})=>run(name,v).at(-1).vars;
let cases=0;
for(const [key,t]of Object.entries(ASSEMBLY_TRACES)){
 const inputs=t.inputs.reduce((sets,i)=>sets.flatMap(s=>(i.type==='select'?i.options.map(o=>o.value):[...new Set([i.min,i.value,i.max])]).map(v=>({...s,[i.id]:v}))),[{}]);
 for(const v of inputs){const steps=t.run(v);const code=typeof t.code==='function'?t.code(v):t.code;cases++;assert.deepEqual(steps,t.run(v));assert(steps.length>1);for(const s of steps){assert(Number.isInteger(s.line)&&s.line>=0&&s.line<code.length,key);for(const n of Object.values(s.vars))if(typeof n==='number')assert(Number.isFinite(n),key);}}
}
assert.equal(end('add',{case:'unsigned-limit',amount:1}).eax,0);
assert.equal(end('add',{case:'unsigned-limit',amount:1}).CF,1);
assert.equal(end('add',{case:'unsigned-limit',amount:1}).OF,0);
assert.equal(end('add',{case:'signed-limit',amount:1}).CF,0);
assert.equal(end('add',{case:'signed-limit',amount:1}).OF,1);
assert.equal(end('sub',{case:'signed-limit',amount:1}).OF,1);
assert.equal(end('sub',{case:'ordinary',amount:150}).CF,1);
for(const name of ['inc','dec'])assert.equal(end(name).CF,1);
for(let value=0;value<256;value++){
 assert.equal(end('movzx',{value}).expanded,value);
 assert.equal(end('movsx',{value}).expanded,value<128?value:value-256);cases+=2;
}
assert.equal(end('lea',{index:2}).eax,'0x00001028');
assert.equal(end('cmp',{price:150}).eax,100);
assert.equal(end('test',{status:5}).eax,5);
assert.equal(end('test',{status:5}).ZF,0);
assert.equal(end('test',{status:3}).ZF,1);
assert.equal(end('jcc',{case:'signed',jump:'jl'}).taken,true);
assert.equal(end('jcc',{case:'signed',jump:'jb'}).taken,false);
assert.equal(end('jcc',{case:'overflow',jump:'jl'}).taken,true);
assert.equal(end('jcc',{case:'overflow',jump:'js'}).taken,false);
for(const name of ['call','ret']){assert.equal(end(name).gold,11);assert.equal(end(name).esp,'0x00008000');}
for(const name of ['push','pop']){assert.equal(end(name).ebx,80);assert.equal(end(name).esp,'0x00008000');}
assert.equal(end('idiv',{coins:-23,players:4}).eax,-5);
assert.equal(end('idiv',{coins:-23,players:4}).edx,-3);
assert(!Object.hasOwn(end('idiv',{players:0}),'share'));
assert.equal(end('sar',{value:-3,count:1})['signed reading'],-2);
assert.equal(end('shr',{value:-3,count:1}).eax,2147483646);
for(const name of ['shl','shr','sar']){assert.equal(end(name,{value:-3,count:0}).OF,1);assert.equal(end(name,{count:2}).OF,'undefined');}
assert.equal(end('not',{value:5}).CF,1);
assert.equal(end('not',{value:5}).ZF,1);
assert.equal(end('xor',{value:5}).status,1);
assert.equal(end('imul',{case:'overflow',factor:4}).OF,1);
assert.equal(end('nop').ammo,5);
assert.equal(end('int3').ammo,6);
assert.equal(end('int3',{action:'resume'}).ammo,5);
assert.equal(end('movss')['xmm0 upper 96'],'zero');
assert.equal(end('movss')['xmm1 upper 96'],'previous contents');
assert.equal(end('cvtsi2ss',{case:'rounded'}).score_float,16777216);
assert.equal(end('cvttss2si',{case:'negative'}).score_int,-2);
assert.equal(end('cvttss2si',{case:'nan'})['valid conversion'],false);
assert.equal(end('comiss',{case:'nan'}).outcome,'reject invalid speed');
assert.equal(end('comiss',{case:'nan'}).ZF,1);
assert.equal(end('comiss',{case:'nan'}).PF,1);
assert.equal(end('comiss',{case:'equal'}).PF,0);
console.log(`${Object.keys(ASSEMBLY_TRACES).length} assembly traces: ${cases} bounded cases and independent flag, stack, signedness, division and SSE assertions passed.`);

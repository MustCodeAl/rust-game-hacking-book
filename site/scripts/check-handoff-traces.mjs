import assert from 'node:assert/strict';import{HANDOFF_TRACES as T}from'../src/scripts/handoff-traces.js';let cases=0;
function choices(x){return x.type==='select'?x.options.map(o=>o.value):[...new Set([x.min,Math.min(x.max,x.min+x.step),x.value,Math.max(x.min,x.max-x.step),x.max])];}
function product(xs){return xs.reduce((a,x)=>a.flatMap(v=>choices(x).map(c=>({...v,[x.id]:c}))),[{}]);}
function last(id,v){return T[id].run(v).at(-1).vars;}
for(const[id,t]of Object.entries(T))for(const v of product(t.inputs)){
 const r=t.run(v);assert.ok(r.length>=3&&r.length<80,id);assert.deepEqual(r,t.run(v),id+' deterministic');
 for(const x of r){assert.ok(Number.isInteger(x.line)&&x.line>=0&&x.line<t.code.length,id);assert.ok(x.say.length>0,id);for(const y of Object.values(x.vars))if(typeof y==='number')assert.ok(Number.isFinite(y),id);}
 cases++;
}
for(let g of[0,24,25,26,120])for(let c of[0,25,120])assert.equal(last('handoff-affordable-purchase',{gold:g,cost:c}).stored_gold,g>=c?g-c:g);
for(let n=1;n<=6;n++)assert.equal(last('handoff-instruction-span',{jump:n}).resume,'0x'+(0x1000+(n<=2?2:6)).toString(16).toUpperCase());
for(let a=0;a<=8;a++)for(let d=0;d<=4;d++){const x=last('handoff-recorder-queue',{arrivals:a,drain:d});assert.equal(x.queued+x.dropped+x.written,a);}
for(let d of[-64,0,64])assert.equal(last('handoff-call-destination',{displacement:d}).instruction_pointer,'0x1005');
for(let p of['up','down'])for(let c of['up','down']){const x=last('handoff-input-edge',{previous:p,current:c});assert.equal(x.pressed,p==='up'&&c==='down');assert.equal(x.released,p==='down'&&c==='up');}
for(let a of['0','1','2','3'])for(let f=2048;f<=2052;f++){const x=last('handoff-ioctl-fields',{access:a,function:f});assert.equal(x.decoded_access,Number(a));assert.equal(x.decoded_function,f);assert.equal(x.decoded_method,0);assert.equal(x.decoded_device,0x8000);}
for(let p=0;p<=15;p++)for(let bit of['0','1']){const x=last('handoff-jtag-shift',{pattern:p,incoming:bit});assert.equal(x.register,bit==='1'?15:0);assert.equal(x.outgoing,[0,1,2,3].map(i=>p>>i&1).join(''));}
for(let chips=1;chips<=4;chips++)assert.equal(last('handoff-bypass-chain',{chips}).inferred_chips,chips);
for(let operand=0;operand<=255;operand++){const x=last('handoff-emulator-step',{operand});assert.equal(x.A,(10+operand)&255);assert.equal(x.PC,'0x06');}
console.log(`${Object.keys(T).length} trace models: ${cases} default/boundary/choice executions and independent arithmetic/state assertions pass.`);

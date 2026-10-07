import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH || 'playwright');
const items=JSON.parse(readFileSync(new URL('./scene-audit-cases.json',import.meta.url),'utf8'));
const out=process.env.QA_OUTPUT || '/tmp/gha-scene-player';mkdirSync(out,{recursive:true});
const b=await chromium.launch({executablePath:process.env.CHROME_PATH});
const rows=[],clips=[];let actions=0;
try{for(const width of [420,1280]){
 const ctx=await b.newContext({viewport:{width,height:1100}});await ctx.route('https://**/*',r=>r.abort());
 for(const item of items){
  const path=item.hosts[0].path;console.log(width,item.name);const p=await ctx.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
  const response=await p.goto(`${(process.env.BOOK_BASE_URL || 'http://127.0.0.1:8766/rust-game-hacking-book/').replace(/\/?$/, '/') }pages/${path}/`,{waitUntil:'domcontentloaded'});assert.equal(response.status(),200);
  const r=p.locator(`[data-scene-id="scene-${item.name}"]`);await r.scrollIntoViewIfNeeded();const scrub=r.locator('[data-scene-scrub]');await scrub.waitFor({state:'visible'});
  await scrub.focus();await scrub.press('Home');actions++;
  await r.locator('[data-scene-action="play"]').click();actions++;await p.waitForTimeout(170);
  assert(Number(await scrub.inputValue())>0,item.name+': playback progresses');
  await r.locator('[data-scene-action="play"]').click();actions++;
  await scrub.focus();await scrub.press('Home');actions++;const start=await r.locator('svg').innerHTML();
  await scrub.press('End');actions++;assert.notEqual(await r.locator('svg').innerHTML(),start,item.name+': state changes');
  for(const value of [0,250,500,750,1000]){
   await scrub.evaluate((e,v)=>{e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));},value);
   const bad=await r.locator('svg').evaluate(svg=>{
    const s=svg.getBoundingClientRect();return [...svg.querySelectorAll('text')].filter(n=>{const c=getComputedStyle(n);if(c.visibility==='hidden'||+c.opacity<.05)return false;for(let e=n.parentElement;e&&e!==svg;e=e.parentElement)if(+getComputedStyle(e).opacity<.05)return false;const r=n.getBoundingClientRect();return r.width>0&&r.height>0&&(r.left<s.left-2||r.right>s.right+2||r.top<s.top-2||r.bottom>s.bottom+2);}).map(n=>n.textContent);
   });if(bad.length)clips.push({name:item.name,width,value,text:bad});
  }
  await r.locator('[data-scene-action="restart"]').click();actions++;assert.equal(await r.getAttribute('data-playing'),'true');await r.locator('[data-scene-action="play"]').click();actions++;await scrub.focus();await scrub.press('Home');assert.equal(Number(await scrub.inputValue()),0);
  await r.locator('[data-scene-action="next"]').click();actions++;assert(Number(await scrub.inputValue())>0);
  await scrub.focus();await scrub.press('End');await r.screenshot({path:`${out}/${item.name}-${width}.png`});
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
  rows.push({name:item.name,path,width});await p.close();
 }await ctx.close();
}}finally{await b.close();}
writeFileSync(`${out}/results.json`,JSON.stringify({rows,clips,actions},null,2));
console.log(`${rows.length} scene groups; ${actions} actual playback controls; ${clips.length} text clipping observations.`);
if(clips.length){console.log(JSON.stringify(clips));process.exitCode=1;}

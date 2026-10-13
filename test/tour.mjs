import { chromium } from '/home/claude/.npm-global/lib/node_modules/playwright/index.mjs';
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1440,height:900}}); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{ if(m.type()==='error'&&!/ERR_|Failed to load/.test(m.text())) errs.push('console: '+m.text()); });
await p.goto('file://'+process.cwd()+'/test/index.html'); await p.waitForTimeout(600);
const out=[]; const ok=(n,c,i='')=>out.push((c?'PASS ':'FAIL ')+n+(i?' — '+i:''));
// open each seed board
const boards=await p.evaluate(()=>window.__space.canvasKids('home').filter(e=>e.type==='board').map(e=>e.id));
for(const id of boards){ await p.evaluate(id=>{ const n=document.querySelector('#world .el[data-id="'+id+'"]'); n.dispatchEvent(new MouseEvent('dblclick',{bubbles:true})); },id); await p.waitForTimeout(250); ok('open board '+id, await p.evaluate(id=>window.__space.S.cur===id,id)); await p.keyboard.press('Control+u'); await p.waitForTimeout(150); }
// every template applies cleanly
await p.click('#templates'); await p.waitForTimeout(100); const tids=await p.$$eval('#modal [data-t]', bs=>bs.map(b=>b.dataset.t)); await p.keyboard.press('Escape');
for(const t of tids){ if(t==='blank') continue; await p.click('#templates'); await p.click('#modal [data-t="'+t+'"]'); await p.waitForTimeout(150); }
ok('all '+(tids.length-1)+' templates applied', errs.length===0, errs.join('|'));
// search
await p.keyboard.press('Control+f'); await p.keyboard.type('brief'); await p.waitForTimeout(150); ok('search finds results', (await p.$$('.spanel .nav')).length>0); await p.keyboard.press('Escape');
// export markdown generation
const md=await p.evaluate(()=>{ try{ return document.querySelector('#io')&&true; }catch(e){ return false; } }); ok('export button', md);
// undo stack
const n0=await p.evaluate(()=>Object.keys(window.__space.S.els).length); for(let i=0;i<5;i++){ await p.keyboard.press('Control+z'); } await p.waitForTimeout(150); const n1=await p.evaluate(()=>Object.keys(window.__space.S.els).length); ok('undo reverts templates', n1<n0, n0+'→'+n1);
// presentation
await p.keyboard.press('Control+Alt+KeyP'); await p.waitForTimeout(100); ok('presentation on', await p.evaluate(()=>document.querySelector('#app').classList.contains('present'))); await p.keyboard.press('Escape');
// trash + restore
const id=await p.evaluate(()=>{ const s=window.__space; const e=s.mk('note',{x:50,y:50,content:{html:'<p>trash me</p>'}}); s.addEl(e); s.S.sel=new Set([e.id]); s.render(); return e.id; }); await p.keyboard.press('Backspace'); await p.click('#trashbtn'); await p.waitForTimeout(100); await p.click('#modal .it[data-id="'+id+'"] [data-r]'); await p.waitForTimeout(100); ok('trash restore', await p.evaluate(id=>!window.__space.S.els[id].trashed,id)); await p.keyboard.press('Escape');
// persistence: reload keeps data
await p.waitForTimeout(400); const before=await p.evaluate(()=>Object.keys(window.__space.S.els).length); await p.reload(); await p.waitForTimeout(600); const after=await p.evaluate(()=>Object.keys(window.__space.S.els).length); ok('reload keeps data', before===after, before+'/'+after);
// performance with 300 cards
const t=await p.evaluate(()=>{ const s=window.__space; const t0=performance.now(); for(let i=0;i<300;i++){ const e=s.mk('note',{x:(i%20)*360,y:Math.floor(i/20)*140,content:{html:'<p>card '+i+'</p>'}}); s.addEl(e); } s.render(); return Math.round(performance.now()-t0); }); ok('300 cards render', t<1500, t+'ms');
ok('no errors', errs.length===0, errs.slice(0,5).join(' | '));
console.log(out.join('\n')); await b.close();

/* ============ paridade com o Milanote (fonte: código do Milanote 3.18.138 via REA) ============ */

/* ---------- utilidades ---------- */
const BG_TYPES = new Set(['note','tasks','link','file','doc','table','comment']);     // aceitam Background + Top strip
const CAPTION_TYPES = new Set(['image','link','file','swatch','doc','table']);
const RENAME_SEL = {board:'.bt', column:'.ct', doc:'.dt', file:'.fn', link:'.lt', table:'.tbt'};
const isImgFull = e => e && e.type==='image' && (e.content.blobId || e.content.url);
const selEls = () => [...S.sel].map(id=>S.els[id]).filter(Boolean);
const ez = () => view().z * S.ui;
function touch(id){ const e=S.els[id]; if(e) e.modified=Date.now(); }
function putInboxTop(e){ e.section='inbox'; e.parentId=S.cur; e.index=-1; S.els[e.id]=e; renumber(S.cur,'inbox'); S.inboxOpen=true; return e; }
function fmtWhen(t){ if(!t) return ''; const d=new Date(t), now=new Date(); const same=d.toDateString()===now.toDateString(); return same ? 'today at '+d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}) : d.toLocaleDateString('en-US',{day:'numeric',month:'short',year: d.getFullYear()===now.getFullYear()?undefined:'numeric'}); }
function hexToRgb(h){ const m=/^#?([0-9a-f]{6})$/i.exec(h||''); if(!m) return null; const n=parseInt(m[1],16); return [n>>16&255,n>>8&255,n&255]; }
function rgbToHsl([r,g,b]){ r/=255; g/=255; b/=255; const mx=Math.max(r,g,b), mn=Math.min(r,g,b); let h=0,s=0; const l=(mx+mn)/2; if(mx!==mn){ const d=mx-mn; s=l>.5?d/(2-mx-mn):d/(mx+mn); h= mx===r?(g-b)/d+(g<b?6:0) : mx===g?(b-r)/d+2 : (r-g)/d+4; h/=6; } return [Math.round(h*360),Math.round(s*100),Math.round(l*100)]; }
function isLightHex(h){ const c=hexToRgb(h); if(!c) return true; return (0.299*c[0]+0.587*c[1]+0.114*c[2])>150; }
function saveDataUrl(url, name){ fetch(url).then(r=>r.blob()).then(b=>saveOut(name,b)).catch(()=>{ const a=document.createElement('a'); a.href=url; a.target='_blank'; a.rel='noopener'; a.click(); }); }

/* ---------- 1. menu de contexto do elemento (elementContextMenuConfig.ts) ---------- */
function canPasteStyles(){ const src=S.clip?.[0]?.e; if(!src) return false; return selEls().some(t=>styleUpdates(src,t)); }
function styleUpdates(src, t){ const up={}; if(isLine(src)&&isLine(t)){ ['startStyle','endStyle','style','weight'].forEach(k=>{ if(src.content[k]!==undefined && src.content[k]!==t.content[k]) up['content.'+k]=src.content[k]; }); }
  if((src.color||null)!==(t.color||null) && !(isLine(src)^isLine(t))) up.color=src.color||null; if(BG_TYPES.has(src.type)&&BG_TYPES.has(t.type)&&(src.bg||null)!==(t.bg||null)) up.bg=src.bg||null; return Object.keys(up).length?up:null; }
function pasteStyles(){ const src=S.clip?.[0]?.e; if(!src) return; const targets=selEls().filter(t=>styleUpdates(src,t)); if(!targets.length) return; commit(); targets.forEach(t=>{ const up=styleUpdates(src,t); Object.entries(up).forEach(([k,v])=>{ if(k.startsWith('content.')) t.content[k.slice(8)]=v; else t[k]=v; }); touch(t.id); }); render(); save(); }
function cutSel(){ if(!S.sel.size) return; copySel(); const n=S.sel.size; commit(); [...S.sel].forEach(trashEl); render(); save(); toast(`${n} cut`); }
function elMenuSections(fromToolbar){
  const els=selEls(); if(!els.length) return []; const one=els.length===1?els[0]:null; const all=f=>els.every(f);
  const it=(a,label,kbd,o={})=>({a,label,kbd,...o});
  const secs=[];
  if(!fromToolbar){
    secs.push([ one&&one.type==='column'&&S.clip ? it('paste','Paste','⌘V') : null, it('cut','Cut','⌘X'), it('copy','Copy','⌘C'), canPasteStyles()?it('pstyle','Paste Styles','⌘⌥V'):null, it('dup','Duplicate','⌘D'), it('del','Move to Trash','⌫') ]);
    secs.push([ one&&RENAME_SEL[one.type] ? it('rename','Rename','↩') : null ]);
  }
  secs.push([
    all(e=>e.type==='file'||isImgFull(e)) ? it('download', one&&one.type==='image'?'Download Original Image':all(e=>e.type==='image')?'Download Original Images':'Download') : null,
    one&&one.type==='file' ? it('openfile','Open File') : null,
    all(isImgFull) ? it('replace','Replace Image') : null,
    one&&one.type==='link'&&!one.content.imgBlob ? it('addimg','Add Image') : null,
    one&&one.type==='link'&&one.content.url ? it('copylink','Copy Link Address') : null,
    all(e=>e.type==='image')&&!all(e=>e.content.transparent&&!isImgFull(e)) ? it('crop','Crop Image to Fit Dot Grid','',{check:!els[0].content.full}) : null ]);
  secs.push([ one&&one.type==='drawing'&&one.content.paths?.length ? it('svg','Download SVG') : null ]);
  secs.push([ els.length>1 && all(e=>e.section==='canvas'&&e.parentId===S.cur&&!['line','drawing','column'].includes(e.type)) ? it('group','Group into Column') : null,
    els.filter(e=>!isLine(e)&&e.section==='canvas').length>1 ? it('connect','Connect with Lines','⌘K') : null ]);
  secs.push([ one&&one.type==='drawing' ? it('tosketch','Convert to Sketch Card') : null ]);
  secs.push([ all(e=>e.type==='doc') ? it('tonote','Convert to Note') : null, all(e=>e.type==='note') ? it('todoc','Convert to Document') : null, all(e=>e.type==='column') ? it('toboard','Convert to Board') : null ]);
  secs.push([ it('lock','Lock Position','',{check:all(e=>e.locked)}) ]);
  const inInbox=els.some(e=>e.section==='inbox'); const snapped=isLine(els[0]) && els[0].content.a.el && els[0].content.b.el;
  secs.push([ !inInbox ? it('front','Bring to Front','⌘⇧↑') : null, !inInbox&&!snapped ? it('back','Send to Back','⌘⇧↓') : null ]);
  if(one){ const c=one.created, m=one.modified; secs.push([{info:true,label: m&&m-c>60000 ? `Created ${fmtWhen(c)}, modified ${fmtWhen(m)}` : `Created ${fmtWhen(c)}`}]); }
  return secs.map(s=>s.filter(Boolean)).filter(s=>s.length);
}
function elMenuHtml(fromToolbar){ return elMenuSections(fromToolbar).map(sec=>sec.map(x=> x.info ? `<div class="meta">${esc(x.label)}</div>` : `<button data-a="${x.a}" class="${x.a==='del'?'danger':''}">${x.check!==undefined?`<span class="ck ${x.check?'on':''}">${ICONS.check}</span>`:''}<span class="lb">${esc(x.label)}</span>${x.kbd?`<span class="kbd">${x.kbd}</span>`:''}</button>`).join('')).join('<div class="vs"></div>'); }
function openElementMenu(x, y, fromToolbar){ cmenu.innerHTML=elMenuHtml(fromToolbar); cmenu.classList.add('el-menu'); showCmenu({clientX:x,clientY:y}); }
function runElAction(a){ const els=selEls(); const one=els.length===1?els[0]:null;
  switch(a){
    case 'paste': return pasteIntoColumn(one.id);
    case 'cut': return cutSel(); case 'copy': return copySel(); case 'pstyle': return pasteStyles(); case 'dup': return duplicate(); case 'del': return delSel();
    case 'rename': return startEdit(one.id, RENAME_SEL[one.type]);
    case 'download': return els.forEach(downloadOriginal);
    case 'openfile': return openFileModal(one);
    case 'replace': pickFor=one?one.id:els[0].id; return $('#filepick').click();
    case 'addimg': pickFor='linkimg:'+one.id; return $('#filepick').click();
    case 'copylink': try{ navigator.clipboard.writeText(one.content.url).then(()=>toast('Link copied')).catch(()=>toast(one.content.url)); }catch{ toast(one.content.url); } return;
    case 'crop': { commit(); const v=!els[0].content.full; els.forEach(e=>{ e.content.full=v; }); render(); save(); return; }
    case 'svg': return saveOut(`drawing.svg`, drawingSvg(one));
    case 'group': return groupIntoColumn();
    case 'connect': return connectSelected();
    case 'tosketch': return drawingToSketch(one);
    case 'tonote': commit(); els.forEach(e=>{ e.type='note'; e.content={html:(e.content.title?`<h1>${esc(e.content.title)}</h1>`:'')+(e.content.html||'')}; touch(e.id); }); render(); save(); return;
    case 'todoc': commit(); els.forEach(e=>{ const h=e.content.html||''; const m=/^\s*<h[12][^>]*>(.*?)<\/h[12]>/i.exec(h); e.type='doc'; e.content={title:m?m[1].replace(/<[^>]+>/g,''):'', html:m?h.slice(m[0].length):h}; touch(e.id); }); render(); save(); return;
    case 'toboard': return columnsToBoards(els);
    case 'lock': return toggleLock(); case 'front': return zOrder(1); case 'back': return zOrder(-1);
  } }
async function downloadOriginal(e){ if(e.type==='file'){ return downloadFile(e); } if(e.content.blobId){ const b=await getBlob(e.content.blobId); if(b) return saveOut((e.content.caption||'image')+'.'+((b.type.split('/')[1]||'png').replace('jpeg','jpg')), b); } if(e.content.url) saveDataUrl(e.content.url, e.content.url.split('/').pop().split('?')[0]||'image'); }
function pasteIntoColumn(colId){ if(!S.clip) return; commit(); S.sel.clear(); let idx=listKids(colId).length; const put=(p,parentId)=>{ const c=JSON.parse(JSON.stringify(p.e)); c.id=uid(); c.parentId=parentId; delete c.locked; c.created=Date.now(); S.els[c.id]=c; p.kids.forEach(k=>put(k,c.id)); return c; };
  S.clip.forEach(p=>{ if(['line','drawing','column'].includes(p.e.type)) return; const c=put(p,colId); c.section='list'; c.index=idx++; S.sel.add(c.id); }); render(); save(); }
function groupIntoColumn(){ const els=selEls().filter(e=>e.section==='canvas'&&!['line','drawing','column'].includes(e.type)); if(els.length<2) return; commit(); const b=bboxOf(els);
  const col=mk('column',{x:snap(b.x0),y:snap(b.y0),content:{title:'',collapsed:false}}); addEl(col);
  els.sort((p,q)=>(p.y-q.y)||(p.x-q.x)).forEach((e,i)=>{ e.section='list'; e.parentId=col.id; e.index=i; delete e.w; });
  S.sel=new Set([col.id]); render(); save(); }
function columnsToBoards(cols){ commit(); const out=[]; cols.forEach(c=>{ const b=mk('board',{x:c.x,y:c.y,color:c.color||null,content:{title:c.content.title||'',cover:null,emoji:null,bg:null}}); b.parentId=c.parentId; b.section=c.section; b.index=c.index; if(b.section==='canvas') b.z=maxZ(b.parentId)+1; S.els[b.id]=b; let y=40; listKids(c.id).forEach(k=>{ k.parentId=b.id; k.section='canvas'; k.x=40; k.y=y; k.z=maxZ(b.id)+1; const n=nodesFor(k.id)[0]; y=snap(y+(n?n.offsetHeight:120)+20); }); trashEl(c.id); out.push(b.id); }); S.sel=new Set(out); render(); save(); }
function drawingSvg(e){ const c=e.content; return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${c.w} ${c.h}" width="${c.w}" height="${c.h}">${(c.paths||[]).map(p=>`<path d="${p.d}" stroke="${p.color}" stroke-width="${p.width}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`).join('')}</svg>`; }
function drawingToSketch(e){ const svg=drawingSvg(e); const im=new Image(); const W=Math.max(1,e.content.w), H=Math.max(1,e.content.h); im.onload=async()=>{ const sc=Math.min(2, 1800/Math.max(W,H)); const cv=document.createElement('canvas'); cv.width=W*sc; cv.height=H*sc; const ctx=cv.getContext('2d'); ctx.fillStyle='#ffffff'; ctx.fillRect(0,0,cv.width,cv.height); ctx.drawImage(im,0,0,cv.width,cv.height); const blob=await new Promise(r=>cv.toBlob(r,'image/png')); const id=uid(); await putBlob(id,blob); commit(); e.type='sketch'; e.content={blobId:id,w:cv.width,h:cv.height}; e.w=Math.max(160,Math.min(MAX_W,snap(W))); render(); save(); }; im.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg); }

/* Connect with Lines: árvore geradora mínima (Prim) pela distância entre lados (connectionActions.js) */
function sideDist(a,b){ const dx=Math.max(0, a.x0-b.x1, b.x0-a.x1), dy=Math.max(0, a.y0-b.y1, b.y0-a.y1); return Math.hypot(dx,dy); }
function connectSelected(){ const els=selEls().filter(e=>!isLine(e)&&e.section==='canvas'); if(els.length<2) return; const R={}; els.forEach(e=>{ const r=elRect(e); R[e.id]={x0:r.x,y0:r.y,x1:r.x+r.w,y1:r.y+r.h}; });
  const existing=new Set(canvasKids(S.cur).filter(l=>isLine(l)&&l.content.a.el&&l.content.b.el).map(l=>[l.content.a.el,l.content.b.el].sort().join('|')));
  const ids=els.map(e=>e.id); const inTree=new Set([ids[0]]); const edges=[];
  while(inTree.size<ids.length){ let best=null; inTree.forEach(a=>{ ids.forEach(b=>{ if(inTree.has(b)) return; const d=sideDist(R[a],R[b]); if(!best||d<best.d) best={a,b,d}; }); }); if(!best) break; inTree.add(best.b); edges.push(best); }
  const todo=edges.filter(ed=>!existing.has([ed.a,ed.b].sort().join('|'))); if(!todo.length){ toast('Already connected'); return; }
  commit(); todo.forEach(ed=>{ const l=mk('line',{content:{a:{x:0,y:0,el:ed.a},b:{x:0,y:0,el:ed.b},startStyle:'none',endStyle:'arrow',style:'solid',weight:2,label:'',ctrl:null}}); addEl(l); }); render(); save(); }

/* ---------- 2. empurrar vizinhos quando um cartão cresce (elementCollisionActions.js) ---------- */
const SHADOW_PAD=4, MAX_GAP=3, MAX_MOVES=15;
let colH={}, colSuspendUntil=0;
const ov=(a,b)=>a.l<b.r&&a.r>b.l&&a.t<b.b&&a.b>b.t;
function rectNow(e){ const n=nodesFor(e.id)[0]; return {l:e.x, t:e.y, r:e.x+(n?n.offsetWidth:(e.w||typeWidth(e.type))), b:e.y+(n?n.offsetHeight:0)}; }
const colRO = typeof ResizeObserver!=='undefined' ? new ResizeObserver(entries=>{
  const changes=[]; entries.forEach(en=>{ const n=en.target; if(!n.isConnected) return; const id=n.dataset.id; const e=S.els[id]; if(!e||e.section!=='canvas') return; const h=n.offsetHeight; const old=colH[id]; colH[id]=h; if(old==null||old===0||old===h) return; if(Date.now()<colSuspendUntil||drag||resizing) return; changes.push({e,old,h}); });
  if(!changes.length) return; const moved=new Set(); const budget={n:0};
  changes.forEach(({e,old,h})=>{ const cur=rectNow(e); const prev={...cur,b:e.y+old}; checkCollisions(e.id, prev, cur, new Set(), budget, moved); });
  if(moved.size){ moved.forEach(id=>{ const e=S.els[id]; nodesFor(id).forEach(n=>{ if(n.closest('#world')) n.style.top=e.y+'px'; }); }); renderLines(); save(); }
}) : null;
function checkCollisions(id, prev, cur, handled, budget, moved){ handled.add(id); const dh=cur.b-prev.b; if(!dh) return; const g=GRID;
  const origPad={...prev,b:prev.b+g*(MAX_GAP+1)}, newPad={...cur,b:cur.b+g*(MAX_GAP+1)}, coll={...cur,b:cur.b+g*MAX_GAP};
  const all=canvasKids(S.cur).filter(x=>!isLine(x)&&x.type!=='drawing'); if(all.length>150) return;
  const nbs=all.filter(x=>x.id!==id&&!x.locked&&!handled.has(x.id));
  for(const nb of nbs){ const r=rectNow(nb); if(r.b<=r.t) continue; if(ov(prev,r)) return; }
  const shifted=[];
  for(const nb of nbs){ const r=rectNow(nb); if(r.b<=r.t) continue;
    const down = dh>0 && !ov(prev,r) && ov(coll,r);
    const up = dh<0 && ov(origPad,r) && !ov(cur,r);
    if(!down&&!up){ if(dh>0 && !ov(origPad,r) && ov(newPad,r) && nb.origY==null) nb.origY=nb.y; continue; }
    const gap=Math.round((r.t-(prev.b+SHADOW_PAD))/g); const margin=gap>MAX_GAP?2:gap;
    let ny=(Math.round((cur.b+SHADOW_PAD)/g)+margin)*g;
    if(up){ all.forEach(x=>{ if(x.id===nb.id||handled.has(x.id)) return; const xr=rectNow(x); if(xr.l<r.r&&xr.r>r.l&&xr.b<=r.t&&xr.b>ny-2*g) ny=Math.max(ny,snap(xr.b+2*g)); }); ny=Math.max(ny, nb.origY ?? -1e9); if(ny>=nb.y) continue; }
    if(down && gap>MAX_GAP && nb.origY==null) nb.origY=nb.y;
    if(up && nb.origY!=null && ny<=nb.origY) delete nb.origY;
    if(ny===nb.y) continue; if(budget.n>=MAX_MOVES) break; budget.n++;
    const h=r.b-r.t; nb.y=ny; moved.add(nb.id); handled.add(nb.id); shifted.push({id:nb.id,prev:r,cur:{...r,t:ny,b:ny+h}}); }
  shifted.forEach(s=>checkCollisions(s.id, s.prev, s.cur, handled, budget, moved)); }
function observeCanvas(){ if(!colRO) return; colRO.disconnect(); world.querySelectorAll(':scope > .el').forEach(n=>colRO.observe(n)); }

/* ---------- 3. quick line + duplo clique na alça de largura ---------- */
function qlUpdate(){ document.querySelectorAll('#world .ql').forEach(x=>x.remove()); if(S.sel.size!==1||S.editing||S.draw) return; const e=S.els[[...S.sel][0]]; if(!e||e.section!=='canvas'||e.parentId!==S.cur||isLine(e)||e.locked) return; const n=nodesFor(e.id)[0]; if(!n||!n.closest('#world')) return; const q=document.createElement('div'); q.className='ql'; q.title='Drag to draw a line'; q.innerHTML='<i></i><b>'+ICONS.arrowr+'</b>'; n.appendChild(q); }
function startQuickLine(ev, q){ const src=S.els[q.closest('.el').dataset.id]; const p=toWorld(ev.clientX,ev.clientY); commit(); const l=mk('line',{content:{a:{x:p.x,y:p.y,el:src.id},b:{x:p.x,y:p.y,el:null},startStyle:'none',endStyle:'arrow',style:'solid',weight:2,label:'',ctrl:null}}); addEl(l); lineDrag={id:l.id,end:'b',quick:true,x0:ev.clientX,y0:ev.clientY}; S.sel=new Set([l.id]); document.querySelectorAll('#world .ql').forEach(x=>x.classList.add('dragging')); stage.setPointerCapture(ev.pointerId); renderLines(); }
function toggleNaturalWidth(e){ if(e.locked) return; let natural=CARD_W; if(e.type==='image'&&e.content.w) natural=Math.min(MAX_W, snap(e.content.w)); else if(e.type==='sketch'&&e.content.w) natural=Math.min(MAX_W, snap(e.content.w/2)); commit(); const cur=e.w||typeWidth(e.type); if(cur===typeWidth(e.type) && natural!==cur) e.w=natural; else delete e.w; render(); save(); }

/* ---------- 4. atalhos (keyboardShortcuts.js) ---------- */
function setUi(step){ const sizes=[0.8,0.9,1]; let i=sizes.indexOf(S.ui); if(i<0) i=2; i=clamp(i+step,0,2); S.ui=sizes[i]; try{ localStorage.setItem('space-ui',S.ui); }catch{} applyView(); toast(['Small','Medium','Large'][i]+' interface'); }
function newOfSelectedType(){ const e=selEls()[0]; if(!e||e.section!=='canvas') return; const n=nodesFor(e.id)[0]; commit(); const ne=mk(['board','line','drawing','image','file','swatch','sketch'].includes(e.type)?'note':e.type); ne.x=e.x; ne.y=snap(e.y+(n?.offsetHeight||100)+GRID*2); if(e.w) ne.w=e.w; ne.color=e.color; if(BG_TYPES.has(ne.type)) ne.bg=e.bg; addEl(ne); if(ne.type==='tasks'){ const t=mk('task',{parentId:ne.id,section:'list',index:0}); S.els[t.id]=t; } S.sel=new Set([ne.id]); render(); save(); startEdit(ne.id, {note:'.body',column:'.ct',tasks:'.tt',link:'.lt',comment:'.cmt',doc:'.dt'}[ne.type]); }
function navDown(){ const one=selEls()[0]; if(one&&one.type==='board'&&S.sel.size===1) return openBoard(one.id); const f=S.fwd[S.cur]; if(f&&alive(S.els[f])) openBoard(f); }
function navUp(){ const b=S.els[S.cur]; if(b?.parentId&&S.els[b.parentId]){ S.fwd[b.parentId]=b.id; openBoard(boardOf(b.parentId)?.id||b.parentId); } }
document.addEventListener('keydown', ev=>{ const mod=ev.metaKey||ev.ctrlKey; const typing=ev.target.isContentEditable||['INPUT','TEXTAREA'].includes(ev.target.tagName); if(typing||$('#modal').classList.contains('open')) return;
  if(ev.altKey && !mod){ const al={KeyW:'top',KeyA:'left',KeyS:'bottom',KeyD:'right',KeyH:'hcenter',KeyV:'vcenter'}[ev.code]; if(al){ ev.preventDefault(); ev.stopImmediatePropagation(); alignSel(al); return; }
    if(ev.code==='Backquote'){ ev.preventDefault(); ev.stopImmediatePropagation(); const ids=selEls().filter(e=>!isLine(e)).map(e=>e.id); if(ids.length) toInbox(ids); return; }
    if(ev.key==='Enter'){ ev.preventDefault(); ev.stopImmediatePropagation(); const e=selEls()[0]; if(e&&e.type==='tasks'&&S.sel.size===1){ if(e.content.hideTitle){ commit(); e.content.hideTitle=false; render(); } startEdit(e.id,'.tt'); } return; } }
  if(mod && ev.altKey && ev.shiftKey && (ev.code==='KeyV'||ev.code==='KeyH')){ ev.preventDefault(); ev.stopImmediatePropagation(); alignSel(ev.code==='KeyV'?'vdist':'hdist'); return; }
  if(mod && ev.altKey && ev.code==='KeyV'){ ev.preventDefault(); ev.stopImmediatePropagation(); pasteStyles(); return; }
  if(mod && ev.code==='KeyX'){ ev.preventDefault(); ev.stopImmediatePropagation(); cutSel(); return; }
  if(mod && ev.code==='KeyK'){ ev.preventDefault(); ev.stopImmediatePropagation(); connectSelected(); return; }
  if(mod && ev.shiftKey && ev.code==='KeyU'){ ev.preventDefault(); ev.stopImmediatePropagation(); navDown(); return; }
  if(mod && !ev.shiftKey && ev.code==='KeyU'){ ev.preventDefault(); ev.stopImmediatePropagation(); navUp(); return; }
  if(mod && ev.shiftKey && (ev.code==='Comma'||ev.code==='Period')){ ev.preventDefault(); ev.stopImmediatePropagation(); setUi(ev.code==='Period'?1:-1); return; }
  if(mod && ev.key==='Enter'){ ev.preventDefault(); ev.stopImmediatePropagation(); newOfSelectedType(); return; }
  if(mod && ev.code==='KeyS'){ ev.preventDefault(); ev.stopImmediatePropagation(); toast('Saved'); return; }
  if(!mod && !ev.altKey && ev.key==='/'){ ev.preventDefault(); ev.stopImmediatePropagation(); showHelp(); return; }
  if(!mod && !ev.shiftKey && ev.code==='KeyD' && !S.draw){ ev.stopImmediatePropagation(); return; }
}, true);

/* ---------- 5. colar inteligente (WorkspaceClipboardHandler.jsx) ---------- */
function parseTableClip(html, txt){ if(html && /<table/i.test(html)){ const d=document.createElement('div'); d.innerHTML=html; const t=d.querySelector('table'); if(t){ const rows=[...t.rows].map(r=>[...r.cells].map(c=>c.textContent.trim())); const w=Math.max(0,...rows.map(r=>r.length)); if(rows.length>=2&&w>=2) return rows.map(r=>{ while(r.length<w) r.push(''); return r; }); } }
  if(txt && txt.includes('\t')){ const lines=txt.replace(/\r/g,'').split('\n').filter((l,i,a)=>l.length||i<a.length-1); const rows=lines.map(l=>l.split('\t')); const w=Math.max(...rows.map(r=>r.length)); if(rows.length>=2&&w>=2&&rows.every(r=>r.length>=2)) return rows.map(r=>{ while(r.length<w) r.push(''); return r; }); } return null; }
function parseTaskClip(txt){ const lines=txt.replace(/\r/g,'').split('\n').map(l=>l.trim()).filter(Boolean); if(lines.length<1) return null; const re=/^(?:[-*•]\s*)?\[( |x|X)\]\s*(.*)$/; if(!lines.every(l=>re.test(l))) return null; return lines.map(l=>{ const m=re.exec(l); return {text:m[2],done:m[1].toLowerCase()==='x'}; }); }
document.addEventListener('paste', async ev=>{ if(ev.target.isContentEditable || ['INPUT','TEXTAREA'].includes(ev.target.tagName)) return; ev.preventDefault(); ev.stopImmediatePropagation();
  const cd=ev.clipboardData; const txt=(cd.getData('text/plain')||''); const html=cd.getData('text/html')||''; const files=[...cd.files];
  if(txt.trim()==='space:clip'){ pasteClip(); return; }
  const tbl=parseTableClip(html,txt); if(tbl){ commit(); const e=mk('table',{content:{rows:tbl,title:'',showTitle:false}}); putInboxTop(e); S.sel=new Set([e.id]); render(); save(); toast('Table pasted into Unsorted'); return; }
  if(files.length){ commit(); const cap=/^https?:\/\/\S+$/i.test(txt.trim())?txt.trim():''; for(const f of files.reverse()){ const e=await addAnyFile(f,{section:'inbox'}); e.index=-1; renumber(S.cur,'inbox'); if(cap&&e.type==='image') e.content.caption=cap; } S.inboxOpen=true; render(); save(); toast('Pasted into Unsorted'); return; }
  const capT=selEls().filter(e=>CAPTION_TYPES.has(e.type)&&!e.content.showCaption); if((txt.trim()||html)&&capT.length){ commit(); capT.forEach(e=>{ e.content.caption=txt.trim(); e.content.showCaption=true; touch(e.id); }); render(); save(); return; }
  if(!txt.trim()&&!html) return;
  const tasks=parseTaskClip(txt); if(tasks){ commit(); const e=mk('tasks',{content:{title:''}}); putInboxTop(e); tasks.forEach((t,i)=>{ const k=mk('task',{parentId:e.id,section:'list',index:i,content:t}); S.els[k.id]=k; }); render(); save(); toast('To-do pasted into Unsorted'); return; }
  const t=txt.trim(); if(/^https?:\/\/\S+$/i.test(t) && t.length<2000 && !/^mailto:/i.test(t)){ commit(); let e; if(/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(t)) e=mk('image',{content:{blobId:null,url:t,w:0,h:0,caption:''}}); else { e=mk('link',{content:{url:t,title:'',preview:null}}); setLink(e,t,''); } putInboxTop(e); S.sel.clear(); render(); save(); toast('Link pasted into Unsorted'); return; }
  commit(); const body = html ? cleanHtml(html.replace(/<!--[\s\S]*?-->/g,'').replace(/<meta[^>]*>/gi,'')).replace(/(<p><br><\/p>\s*)+$/,'') : esc(t).split(/\n+/).map(l=>`<p>${l}</p>`).join('');
  const e=mk('note',{content:{html:body||esc(t)}}); putInboxTop(e); S.sel=new Set([e.id]); render(); save(); toast('Note pasted into Unsorted'); }, true);
function pasteClipAt(pos){ if(!S.clip) return; commit(); S.sel.clear(); const items=S.clip; const canvasItems=items.filter(p=>p.e.section==='canvas'); let ox=0, oy=0; if(canvasItems.length){ const xs=canvasItems.map(p=>isLine(p.e)?Math.min(p.e.content.a.x,p.e.content.b.x):p.e.x), ys=canvasItems.map(p=>isLine(p.e)?Math.min(p.e.content.a.y,p.e.content.b.y):p.e.y); ox=snap(pos.x)-Math.min(...xs); oy=snap(pos.y)-Math.min(...ys); }
  const put=(p,parentId)=>{ const c=JSON.parse(JSON.stringify(p.e)); c.id=uid(); c.parentId=parentId; c.created=Date.now(); delete c.locked; S.els[c.id]=c; p.kids.forEach(k=>put(k,c.id)); return c; };
  let i=0; items.forEach(p=>{ const c=put(p,S.cur); if(c.section==='canvas'){ if(isLine(c)){ ['a','b'].forEach(k=>{ c.content[k].el=null; c.content[k].x+=ox; c.content[k].y+=oy; }); if(c.content.ctrl){ c.content.ctrl.x+=ox; c.content.ctrl.y+=oy; } } else { c.x+=ox; c.y+=oy; } } else { c.section='canvas'; c.x=snap(pos.x)+i*GRID*2; c.y=snap(pos.y)+i*GRID*2; i++; } c.z=maxZ(S.cur)+1; S.sel.add(c.id); }); render(); save(); }

/* ---------- 6. cor do cartão (Background / Top strip) e fundo do quadro ---------- */
function colorPopup(anchor){ const els=selEls(); const types=new Set(els.map(e=>e.type)); const canBg=[...types].every(t=>BG_TYPES.has(t)); const e0=els[0]; let mode = canBg ? (S.colorMode || (e0.color&&!e0.bg ? 'strip':'bg')) : 'strip';
  const palette = types.size===1&&types.has('column') ? COLUMN_COLORS : COLORS;
  const draw=()=>{ const curV = mode==='bg' ? (e0.bg||null) : (e0.color||null);
    const p=openPop(anchor, `${canBg?`<div class="cmodes"><button data-m="bg" class="${mode==='bg'?'on':''}">Background</button><button data-m="strip" class="${mode==='strip'?'on':''}">Top strip</button></div>`:''}<div class="cgrid">${Object.entries(palette).map(([k,v])=>`<button class="sw ${v?'':'none'} ${(v||null)===curV?'on':''}" data-c="${v||''}" title="${k}" style="${v?'background:'+v:''}"></button>`).join('')}${mode==='bg'&&[...types].every(t=>t==='note')?`<button class="sw tr ${curV==='transparent'?'on':''}" data-c="transparent" title="Transparent"></button>`:''}<label class="sw cu" title="Custom color"><input type="color" value="${/^#/.test(curV||'')?curV:'#4ebafd'}">${ICONS.pipette}</label></div>`, 'colorpop');
    p.onclick=ev=>{ const m=ev.target.closest('[data-m]'); if(m){ mode=m.dataset.m; S.colorMode=mode; draw(); return; } const b=ev.target.closest('[data-c]'); if(!b) return; apply(b.dataset.c||null); closePop(); };
    const ci=p.querySelector('input[type=color]'); ci.addEventListener('change', ()=>{ apply(ci.value); closePop(); }); };
  const apply=v=>{ commit(); selEls().forEach(e=>{ if(mode==='bg') e.bg=v; else e.color=v; touch(e.id); }); render(); save(); };
  draw(); }
let bgPicker=null;
function chooseBoardColor(){ if(!bgPicker){ bgPicker=document.createElement('input'); bgPicker.type='color'; bgPicker.style.cssText='position:fixed;left:-100px;top:0;opacity:0'; document.body.appendChild(bgPicker); bgPicker.addEventListener('input',()=>{ const b=S.els[S.cur]; b.content.bg=bgPicker.value; applyBoardBg(); }); bgPicker.addEventListener('change',()=>{ save(); }); }
  const b=S.els[S.cur]; bgPicker.value=/^#/.test(b.content.bg||'')?b.content.bg:'#e3e3e8'; commit(); bgPicker.click(); }
function applyBoardBg(){ const b=S.els[S.cur]; const bg=b?.content?.bg||''; stage.style.backgroundColor=bg; stage.classList.toggle('custom-bg-light', !!bg && isLightHex(bg)); stage.classList.toggle('custom-bg-dark', !!bg && !isLightHex(bg)); stage.classList.toggle('nogrid', !!b?.content?.noGrid); }

/* ---------- 7. checklist, divisor e markdown ao digitar ---------- */
document.addEventListener('input', ev=>{ const f=ev.target.closest?.('.body[contenteditable="true"]'); if(!f) return; const s=getSelection(); if(!s.rangeCount) return; let node=s.anchorNode; let blk=(node.nodeType===3?node.parentElement:node).closest('p,div,h1,h2,li,blockquote')||null; if(!blk||!f.contains(blk)) return; if(blk===f){ if(node.nodeType!==3||node.textContent!=='---') return; const hr=document.createElement('hr'); const np=document.createElement('p'); np.innerHTML='<br>'; node.replaceWith(hr,np); const r=document.createRange(); r.setStart(np,0); r.collapse(true); s.removeAllRanges(); s.addRange(r); return; } if(blk.textContent==='---'&&blk.tagName!=='LI'){ blk.outerHTML='<hr><p id="__np"><br></p>'; const np=f.querySelector('#__np'); np.removeAttribute('id'); const r=document.createRange(); r.setStart(np,0); r.collapse(true); s.removeAllRanges(); s.addRange(r); } });
document.addEventListener('keydown', ev=>{ if(ev.key!==' ') return; const f=ev.target.closest?.('.body[contenteditable="true"]'); if(!f) return; const s=getSelection(); if(!s.rangeCount) return; const node=s.anchorNode; const blk=node.nodeType===3?node.parentElement:node; const line=blk.closest('p,div,h1,h2,li')||blk; if(line.textContent!=='[]'&&line.textContent!=='[ ]') return; ev.preventDefault(); ev.stopImmediatePropagation(); line.textContent=''; const before=new Set(f.querySelectorAll('ul')); document.execCommand('insertUnorderedList'); const ul=[...f.querySelectorAll('ul')].find(u=>!before.has(u)) || (()=>{ const a=getSelection().anchorNode; return (a.nodeType===3?a.parentElement:a).closest('ul'); })(); if(ul) ul.classList.add('cl'); }, true);
document.addEventListener('pointerdown', ev=>{ const li=ev.target.closest?.('.body ul.cl > li'); if(!li) return; const r=li.getBoundingClientRect(); if(ev.clientX>r.left+2) return; ev.preventDefault(); ev.stopPropagation(); const n=li.closest('.el'); const e=S.els[n?.dataset.id]; if(!e) return; li.classList.toggle('done'); const body=li.closest('.body'); if(body.isContentEditable) return; commit(); e.content.html=cleanHtml(body.innerHTML); touch(e.id); save(); }, true);
function insertMenu(anchor){ const boards=Object.values(S.els).filter(e=>e.type==='board'&&!e.trashed&&e.id!==S.cur).slice(0,30); const EMO=['😀','😂','😍','🤔','👍','👎','🙌','🔥','✨','💡','✅','❌','⚠️','❤️','⭐','🎬','🎨','📷','🎵','📌','📎','📝','📅','⏰','🚀','🎯','💰','🏠','🌟','👀'];
  const sel=getSelection(); const rng=sel.rangeCount?sel.getRangeAt(0).cloneRange():null;
  const p=openPop(anchor, `<button data-i="hr">${ICONS.minus} Divider line</button><div class="h">Emoji</div><div class="emo">${EMO.map(x=>`<button data-e="${x}">${x}</button>`).join('')}</div>${boards.length?`<div class="h">Link to board</div><div class="bl">${boards.map(b=>`<button data-b="${b.id}">${ICONS.board} ${esc(b.content.title||'Untitled')}</button>`).join('')}</div>`:''}`,'insertpop');
  p.onclick=ev=>{ const b=ev.target.closest('button'); if(!b) return; const body=nodesFor(S.editing)[0]?.querySelector('.body')||$('#dbody'); body?.focus(); if(rng){ sel.removeAllRanges(); sel.addRange(rng); }
    if(b.dataset.i==='hr') document.execCommand('insertHTML',false,'<hr><p><br></p>'); else if(b.dataset.e) document.execCommand('insertText',false,b.dataset.e); else if(b.dataset.b){ const bd=S.els[b.dataset.b]; document.execCommand('insertHTML',false,`<a href="#" data-board="${bd.id}">${esc(bd.content.title||'Untitled')}</a>&nbsp;`); } closePop(); }; }
document.addEventListener('click', ev=>{ const a=ev.target.closest?.('.body a[data-board]'); if(!a||a.closest('[contenteditable="true"]')) return; ev.preventDefault(); const id=a.dataset.board; if(alive(S.els[id])){ closeModal(); openBoard(id); } else toast('Board not found'); });
function toggleInlineCode(){ const s=getSelection(); if(!s.rangeCount) return; const n=s.anchorNode; const code=(n.nodeType===3?n.parentElement:n).closest('code'); if(code){ code.replaceWith(...code.childNodes); return; } if(s.isCollapsed){ toast('Select some text first'); return; } document.execCommand('insertHTML',false,`<code>${esc(s.toString())}</code>`); }
function indentText(dir){ const s=getSelection(); if(!s.rangeCount) return; const n=s.anchorNode; const li=(n.nodeType===3?n.parentElement:n).closest('li'); if(li){ document.execCommand(dir>0?'indent':'outdent'); return; } const blk=curBlock(); if(!blk) return; let lv=+(blk.className.match(/ind(\d)/)?.[1]||0); blk.classList.remove('ind'+lv); lv=clamp(lv+dir,0,4); if(lv) blk.classList.add('ind'+lv); }

/* ---------- 8. links de áudio / vídeo / mapa inline (como o Milanote) ---------- */
const LINK_KIND_PH = {link:'Enter a link URL', audio:'Paste a link from Spotify or Soundcloud', video:'Paste a link from YouTube or Vimeo', map:'Paste a link from Google Maps'};
function newLinkCard(kind, pos){ commit(); const e=mk('link',{content:{url:'',title:'',preview:null,kind}}); if(pos){ e.x=pos.x; e.y=pos.y; addEl(e); } else addEl(e,{atCenter:true}); S.sel=new Set([e.id]); render(); save(); setTimeout(()=>nodesFor(e.id)[0]?.querySelector('.lin')?.focus(),20); return e; }
function mapQueryFromUrl(u){ try{ const x=new URL(u); const q=x.searchParams.get('q')||x.searchParams.get('query'); if(q) return q; const m=x.pathname.match(/\/place\/([^/]+)/); if(m) return decodeURIComponent(m[1].replace(/\+/g,' ')); const c=x.pathname.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/); if(c) return c[1]+','+c[2]; }catch{} return u; }
function commitLinkInput(inp){ const n=inp.closest('.el'); const e=S.els[n?.dataset.id]; if(!e) return; let v=inp.value.trim(); if(!v){ hardDelete(e.id); render(); save(); return; } const kind=e.content.kind||'link';
  if(kind==='map'){ e.type='map'; e.content={query:/^https?:\/\//i.test(v)?mapQueryFromUrl(v):v, url:/^https?:\/\//i.test(v)?v:''}; render(); save(); return; }
  if(!/^https?:\/\//i.test(v)) v='https://'+v; setLink(e,v,''); render(); save(); }
document.addEventListener('keydown', ev=>{ const inp=ev.target.closest?.('.el .lin'); if(!inp) return; if(ev.key==='Enter'){ ev.preventDefault(); commitLinkInput(inp); } else if(ev.key==='Escape'){ ev.preventDefault(); inp.value=''; commitLinkInput(inp); } ev.stopPropagation(); }, true);
document.addEventListener('focusout', ev=>{ const inp=ev.target.closest?.('.el .lin'); if(!inp) return; setTimeout(()=>{ if(inp.isConnected && document.activeElement!==inp) commitLinkInput(inp); },0); });
function embedFor(c){ if(IS_HOSTED||!c.url) return null; const p=parseUrl(c.url); try{ const u=new URL(c.url);
  if(p.provider==='Spotify'){ const m=u.pathname.match(/\/(track|album|playlist|episode|show|artist)\/([A-Za-z0-9]+)/); if(m) return {src:`https://open.spotify.com/embed/${m[1]}/${m[2]}`, h: m[1]==='track'||m[1]==='episode'?152:352}; }
  if(p.provider==='SoundCloud') return {src:`https://w.soundcloud.com/player/?url=${encodeURIComponent(c.url)}&visual=false&show_comments=false`, h:166}; }catch{} return null; }

/* ---------- player de áudio (FileMediaPlayer do Milanote) ---------- */
function fmtDur(t, total){ t=Math.max(0,Math.floor(t||0)); total=Math.floor(total||0); const h=Math.floor(t/3600), m=Math.floor(t/60)-h*60, s=t-h*3600-m*60; const showH=total>=3600; const padM=showH||Math.floor(total/60)>9; return (showH?h+':':'')+(padM?String(m).padStart(2,'0'):m)+':'+String(s).padStart(2,'0'); }
function wireAudio(n, a){ const pb=n.querySelector('.mpp'), vb=n.querySelector('.mpv'), bar=n.querySelector('.mpb'), fill=bar.querySelector('i'), knob=bar.querySelector('b'), tt=n.querySelector('.mpt');
  const upd=()=>{ const d=a.duration||0, p=d?a.currentTime/d:0; fill.style.width=(p*100)+'%'; knob.style.left=(p*100)+'%'; tt.textContent=fmtDur(a.currentTime,d)+' / '+fmtDur(d,d); };
  const icon=()=>{ pb.innerHTML=a.paused?ICONS.play:ICONS.pause; pb.title=a.paused?'Play':'Pause'; vb.innerHTML=(a.muted||a.volume===0)?ICONS.volx:ICONS.vol; };
  a.addEventListener('loadedmetadata',upd); a.addEventListener('timeupdate',upd); a.addEventListener('play',icon); a.addEventListener('pause',icon); a.addEventListener('ended',()=>{ icon(); }); a.addEventListener('volumechange',icon);
  pb.onclick=ev=>{ ev.stopPropagation(); document.querySelectorAll('.el.file audio').forEach(x=>{ if(x!==a) x.pause(); }); a.paused?a.play().catch(()=>{}):a.pause(); };
  vb.onclick=ev=>{ ev.stopPropagation(); a.muted=!a.muted; if(!a.muted&&a.volume===0) a.volume=1; };
  let pop=null; const hidePop=()=>{ setTimeout(()=>{ if(pop && !pop.matches(':hover') && !vb.matches(':hover') && !pop.classList.contains('drag')){ pop.remove(); pop=null; } },120); };
  vb.onmouseenter=()=>{ if(pop) return; pop=document.createElement('div'); pop.className='mpvol'; pop.innerHTML='<div class="mpvb"><i></i><b></b></div>'; document.body.appendChild(pop); const r=vb.getBoundingClientRect(); pop.style.left=(r.left+r.width/2-16)+'px'; pop.style.top=(r.top-110)+'px'; const vbar=pop.querySelector('.mpvb'); const show=()=>{ const v=a.muted?0:a.volume; vbar.querySelector('i').style.height=(v*100)+'%'; vbar.querySelector('b').style.top=((1-v)*100)+'%'; }; show();
    const set=e=>{ const rr=vbar.getBoundingClientRect(); const v=clamp(1-(e.clientY-rr.top)/rr.height,0,1); a.volume=v; a.muted=v===0; show(); };
    vbar.onpointerdown=e=>{ e.preventDefault(); e.stopPropagation(); pop.classList.add('drag'); set(e); const mv=ev2=>set(ev2); const up=()=>{ pop?.classList.remove('drag'); window.removeEventListener('pointermove',mv); window.removeEventListener('pointerup',up); hidePop(); }; window.addEventListener('pointermove',mv); window.addEventListener('pointerup',up); };
    pop.onmouseleave=hidePop; a.addEventListener('volumechange',show); };
  vb.onmouseleave=hidePop;
  const seek=e=>{ const r=bar.getBoundingClientRect(); const p=clamp((e.clientX-r.left)/r.width,0,1); if(a.duration) a.currentTime=p*a.duration; upd(); };
  bar.parentElement.onpointerdown=e=>{ e.preventDefault(); e.stopPropagation(); bar.classList.add('drag'); seek(e); const mv=ev2=>seek(ev2); const up=()=>{ bar.classList.remove('drag'); window.removeEventListener('pointermove',mv); window.removeEventListener('pointerup',up); }; window.addEventListener('pointermove',mv); window.addEventListener('pointerup',up); };
  icon(); }
document.addEventListener('click', ev=>{ const d=ev.target.closest('.el.file .dl'); if(!d) return; ev.stopPropagation(); const e=S.els[d.closest('.el').dataset.id]; if(e) downloadFile(e); });

/* ---------- ajustes de UI ---------- */
function migrateParity(){ Object.values(S.els).forEach(e=>{ const c=e.content||{};
  if(e.type==='line'){ c.startStyle ??= c.arrowA?'arrow':'none'; c.endStyle ??= (c.arrowB===false?'none':'arrow'); c.style ??= c.dashed?'dashed':'solid'; if(c.weight===3) c.weight=2; if(c.weight>4) c.weight=4; c.ctrl ??= null; }
  if(e.type==='image' && c.showCaption==null) c.showCaption=!!c.caption;
  if(e.type==='tasks' && c.hideTitle==null) c.hideTitle=false;
  if(e.type==='table'){ c.title ??= ''; c.showTitle ??= false; }
  if(e.type==='swatch') c.disp ??= 'hex';
  if(e.type==='board' && c.emoji && !c.icon){ const m={'👋':'hand','🎬':'clapperboard','🎨':'palette','📋':'clipboard-list','💡':'lightbulb','📝':'file-pen-line','🖼️':'image','🎞️':'film','🎵':'music','📷':'camera','🏠':'house','🏢':'building-2','✈️':'plane','⭐':'star','❤️':'heart','🔥':'flame','🚀':'rocket','🎯':'target','📌':'pin','📅':'calendar','💼':'briefcase'}[c.emoji]; if(m){ c.icon=m; c.emoji=null; } }
}); }
try{ const u=+localStorage.getItem('space-ui'); if([0.8,0.9,1].includes(u)) S.ui=u; }catch{}

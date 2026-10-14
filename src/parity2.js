/* ============ v0.7 — paridade, rodada 2 (itens 1-10) ============ */

/* ---- 1. comentário anexado (Milanote: section ATTACHED, HotSpot x:100% y:2rem) ---- */
const attachedKids = pid => children(pid,'attached').sort((a,b)=>(a.created||0)-(b.created||0));
function attachComments(n,e){
  const ks=attachedKids(e.id); if(!ks.length) return;
  n.classList.add('has-att');
  const box=document.createElement('div'); box.className='atts';
  ks.forEach((k,i)=>{ const cn=elNode(k); cn.classList.add('attc'); if(!k.content.collapsed) cn.classList.add('open'); cn.style.top=(i*34)+'px'; box.appendChild(cn); });
  n.appendChild(box);
}
function addAttachedComment(cardId){
  const card=S.els[cardId]; if(!card) return; commit();
  const c=mk('comment'); c.section='attached'; c.parentId=cardId; c.content.collapsed=true; S.els[c.id]=c;
  S.sel=new Set([c.id]); render(); save(); startEdit(c.id,'.cmt');
}
function detachComment(e){
  const card=S.els[e.parentId]; const n=card&&nodesFor(card.id)[0];
  let p; if(n && n.closest('#world')){ const r=n.getBoundingClientRect(); p=toWorld(r.right+20, r.top); } else { const r=stage.getBoundingClientRect(); p=toWorld(r.left+r.width/2, r.top+r.height/2); }
  e.section='canvas'; e.parentId=S.cur; e.x=snap(p.x); e.y=snap(p.y); e.z=maxZ(S.cur)+1; e.content.collapsed=false;
}
let attHover=null, attLastEv=null;
const ATTACH_DELAY=450;
function attachDropTarget(ev,under){
  const comments = drag.kind==='tool' ? drag.type==='comment' : (drag.kind==='el' && drag.ids.every(id=>S.els[id]?.type==='comment'));
  if(!comments){ attHover=null; return null; }
  const card=under.map(x=>x.closest?.('.el')).find(x=>x && x.closest('#world,#inbox-list') && !x.classList.contains('comment') && !x.classList.contains('column') && !x.classList.contains('dragging') && !(drag.ids||[]).includes(x.dataset.id));
  if(!card){ attHover=null; return null; }
  const id=card.dataset.id; const now=Date.now(); attLastEv={clientX:ev.clientX,clientY:ev.clientY};
  if(!attHover || attHover.id!==id){ clearTimeout(attHover?.t); attHover={id,start:now,t:setTimeout(()=>{ if(drag&&drag.moved&&attLastEv){ dropT=findDrop(attLastEv); } }, ATTACH_DELAY+20)}; }
  if(drag.kind!=='tool' && now-attHover.start<ATTACH_DELAY) return null;
  card.classList.add('over','attach-over'); return {kind:'attach',id};
}

/* ---- 3. busca (Milanote BoardSearchPanel: quadros + inner hits, recentes, datas, filtro do quadro atual) ---- */
const TYPE_IC={note:'sticky',image:'image',link:'link',column:'column',tasks:'tasks',task:'tasks',board:'board',swatch:'swatch',file:'file',line:'line',comment:'comment',table:'table',sketch:'sketch',doc:'doc',map:'map',drawing:'draw'};
function hostBoardId(e){ let p=e; while(p){ if(p.section==='canvas'||p.section==='inbox') return p.parentId; p=S.els[p.parentId]; } return null; }
function boardChain(id){ const out=[]; let b=S.els[id]; while(b){ out.unshift(b); b=S.els[b.parentId]; } return out; }
function humanTime(sec){ if(sec<60) return 'Just now'; const m=Math.floor(sec/60); if(m<60) return m===1?'1 minute ago':m+' minutes ago'; const h=Math.floor(m/60); if(h<24) return h===1?'1 hour ago':h+' hours ago'; const d=Math.floor(h/24); if(d<2) return 'Yesterday'; if(d<7) return d+' days ago'; const w=Math.floor(d/7); if(d<30) return w===1?'1 week ago':w+' weeks ago'; const mo=Math.floor(d/30); if(d<365) return mo===1?'1 month ago':mo+' months ago'; const y=Math.floor(d/365); return y===1?'1 year ago':y+' years ago'; }
function boardCounts(id){ const kids=Object.values(S.els).filter(k=>k.parentId===id&&!k.trashed&&(k.section==='canvas'||k.section==='inbox')&&k.type!=='line'); const g={}; kids.forEach(k=>{ const t=k.type==='image'?'image':k.type==='link'?'link':k.type==='board'?'board':k.type==='file'?'file':k.type==='column'?'column':'card'; g[t]=(g[t]||0)+1; }); const names={card:['card','cards'],image:['image','images'],link:['link','links'],board:['board','boards'],file:['file','files'],column:['column','columns']}; const parts=Object.entries(g).sort((a,b)=>b[1]-a[1]).map(([t,n])=>n+' '+names[t][n===1?0:1]); return parts.length?parts.join(', '):'0 cards'; }
function boardIconHtml(b){ const c=b.content; const bi=c.icon&&ICONS['bi_'+c.icon]; return `<span class="sb-ico${bi?' gl':''}" style="${b.color?`--bc:${b.color}`:''}">${bi?bi:c.emoji?esc(c.emoji):esc((c.title||'?').trim()[0]||'?')}</span>`; }
function hl(text,q){ const t=String(text||''); if(!q) return esc(t); const i=t.toLowerCase().indexOf(q); if(i<0) return esc(t); const from=Math.max(0,i-40); return (from?'…':'')+esc(t.slice(from,i))+'<mark>'+esc(t.slice(i,i+q.length))+'</mark>'+esc(t.slice(i+q.length, i+q.length+120)); }
function rawText(e){ const c=e.content||{}; return [c.html?.replace(/<[^>]+>/g,' '), c.title, c.caption, c.text, c.name, c.label, c.url, c.hex, c.query, c.preview?.title, c.rows?.flat().join(' ')].filter(Boolean).join(' ').replace(/\s+/g,' ').trim(); }
let searchSort='viewed';
function searchData(q){
  const boards=Object.values(S.els).filter(e=>e.type==='board'&&alive(e)&&(e.id===S.root||boardChain(e.id).every(alive)));
  const map={}; boards.forEach(b=>map[b.id]={board:b,hits:[],titleHit:false});
  if(q){ Object.values(S.els).forEach(e=>{ if(!alive(e)||e.id===S.root) return; if(e.type==='task') return; const txt=rawText(e).toLowerCase(); let hit=txt.includes(q); if(e.type==='tasks' && !hit) hit=listKids(e.id).some(t=>(t.content.text||'').toLowerCase().includes(q)); if(!hit) return; const hb=hostBoardId(e); if(hb && map[hb]) map[hb].hits.push(e); if(e.type==='board' && map[e.id]) map[e.id].titleHit=(e.content.title||'').toLowerCase().includes(q); }); }
  let list=Object.values(map).filter(r=> q ? (r.hits.length||r.titleHit) : (S.meta.viewed?.[r.board.id]));
  const viewed=r=>S.meta.viewed?.[r.board.id]||0; const modified=r=>Math.max(r.board.modified||r.board.created||0, ...Object.values(S.els).filter(k=>k.parentId===r.board.id).map(k=>k.modified||k.created||0));
  if(searchSort==='relevance' && q) list.sort((a,b)=>(b.hits.length+(b.titleHit?5:0))-(a.hits.length+(a.titleHit?5:0)));
  else if(searchSort==='modified') { list.forEach(r=>r.t=modified(r)); list.sort((a,b)=>b.t-a.t); }
  else { list.forEach(r=>r.t=viewed(r)); list.sort((a,b)=>b.t-a.t); }
  return list;
}
function openSearch(){
  const old=document.querySelector('.spanel'); if(old){ old.querySelector('input').focus(); old.querySelector('input').select(); return; }
  closePop(); const p=document.createElement('div'); p.className='pop spanel';
  p.innerHTML=`<div class="sf"><span class="si">${ICONS.search||''}</span><input type="search" id="sq" placeholder="Search boards and cards" spellcheck="false" autocomplete="off"><button class="sx" title="Clear">${ICONS.x}</button></div><div class="smod"><label class="ssort"><span></span>${ICONS.chevdown||''}<select><option value="viewed">Last viewed</option><option value="modified">Last modified</option><option value="relevance">Relevance</option></select></label><span class="scount"></span></div><div class="sres"></div>`;
  document.body.appendChild(p);
  const br=$('#search').getBoundingClientRect(); p.style.top=(br.bottom+8)+'px'; p.style.left=Math.max(12, Math.min(innerWidth-452, br.right-440))+'px';
  const inp=p.querySelector('input'), res=p.querySelector('.sres'), sel=p.querySelector('select'); sel.value=searchSort; p.querySelector('.ssort span').textContent=sel.selectedOptions[0].textContent;
  if(S.filter?.q) inp.value=S.filter.q;
  let focus=-1, navs=[];
  const setFocus=i=>{ navs.forEach(n=>n.classList.remove('focused')); focus=Math.max(-1,Math.min(navs.length-1,i)); if(focus>=0){ navs[focus].classList.add('focused'); navs[focus].scrollIntoView({block:'nearest'}); } };
  const run=()=>{ const q=inp.value.trim().toLowerCase(); p.querySelector('.sx').style.visibility=q?'visible':'hidden'; const list=searchData(q); const now=Date.now(); let html=''; let lastD=null; let total=0;
    list.forEach((r,ri)=>{ const b=r.board; if(searchSort!=='relevance'||!q){ const tv=r.t||0; const d=tv?humanTime((now-tv)/1000):'Never viewed'; if(d!==lastD){ if(ri>0) html+=`<div class="sdate">${d}</div>`; lastD=d; } }
      total+=r.hits.length; const chain=boardChain(b.id).slice(0,-1).map(x=>x.id===S.root?'Home':(x.content.title||'Untitled')); const hits=r.hits.filter(h=>h.id!==b.id); const shown=r.more?hits:hits.slice(0,5);
      html+=`<div class="sent${b.id===S.cur?' cur':''}" data-b="${b.id}"><div class="sb-crumb">${esc(chain.join(' / '))}</div><div class="sb-row nav" data-b="${b.id}">${boardIconHtml(b)}<div class="sb-main"><div class="sb-t">${hl(b.id===S.root?'Home':(b.content.title||'Untitled'), q)}</div><div class="sb-c">${boardCounts(b.id)}</div></div></div>${shown.map(h=>`<div class="shit nav" data-b="${b.id}" data-id="${h.id}"><i>${ICONS[TYPE_IC[h.type]]||''}</i><div class="mt">${hl(rawText(h)||h.type, q)}</div></div>`).join('')}${hits.length>shown.length?`<div class="smore" data-b="${b.id}">+${hits.length-shown.length} more</div>`:''}</div>`; });
    if(!list.length) html = q ? `<div class="snone"><b>No results for “${esc(inp.value.trim())}”</b><span>Try a different word, or check your spelling.</span></div>` : `<div class="snone"><span>Boards you visit will appear here.</span></div>`;
    res.innerHTML=html; p.querySelector('.scount').textContent = q ? (total===1?'1 match':total+' matches') : '';
    navs=[...res.querySelectorAll('.nav')]; focus=-1;
    res.querySelectorAll('.smore').forEach(m=>m.onclick=ev=>{ ev.stopPropagation(); const r=list.find(x=>x.board.id===m.dataset.b); r.more=true; const keep=res.scrollTop; renderList(list,q); res.scrollTop=keep; });
    // filtro ao vivo do quadro atual
    if(q){ const cur=list.find(r=>r.board.id===S.cur); setFilter({q, board:S.cur, ids:null}, !!cur); } else if(S.filter){ clearFilter(); }
  };
  const renderList=()=>run();
  const activate=n=>{ const bid=n.dataset.b, id=n.dataset.id; const q=inp.value.trim().toLowerCase(); closeSearch(); if(id){ const e=S.els[id]; openBoard(bid,{keepFilter:true}); if(q) setFilter({q,board:bid,ids:null},true); goTo(e); } else { openBoard(bid,{keepFilter:true}); if(q) setFilter({q,board:bid,ids:null},true); else clearFilter(); } };
  res.addEventListener('click', ev=>{ const n=ev.target.closest('.nav'); if(n) activate(n); });
  res.addEventListener('mousemove', ev=>{ const n=ev.target.closest('.nav'); if(n && navs.indexOf(n)!==focus) setFocus(navs.indexOf(n)); });
  inp.addEventListener('input', run);
  inp.addEventListener('keydown', ev=>{ if(ev.key==='ArrowDown'){ ev.preventDefault(); setFocus(focus+1); } else if(ev.key==='ArrowUp'){ ev.preventDefault(); setFocus(focus-1); } else if(ev.key==='Enter'){ ev.preventDefault(); if(focus>=0) activate(navs[focus]); else if(navs[0]) activate(navs[0]); } else if(ev.key==='Escape'){ ev.preventDefault(); ev.stopPropagation(); closeSearch(); } });
  p.querySelector('.sx').onclick=()=>{ inp.value=''; clearFilter(); run(); inp.focus(); };
  sel.onchange=()=>{ searchSort=sel.value; p.querySelector('.ssort span').textContent=sel.selectedOptions[0].textContent; run(); };
  setTimeout(()=>{ inp.focus(); inp.select(); },0); run();
}
function closeSearch(){ document.querySelector('.spanel')?.remove(); }
document.addEventListener('pointerdown', ev=>{ const sp=document.querySelector('.spanel'); if(sp && !sp.contains(ev.target) && !ev.target.closest('#search')) closeSearch(); }, true);

/* filtro do quadro (Milanote: filter_query / filter_ids → cartões que não batem ficam apagados) */
function setFilter(f, show=true){ S.filter=f; applyFilter(); }
function clearFilter(){ if(!S.filter) return; S.filter=null; applyFilter(); }
function filterMatch(e,q){ if(!e) return false; if(rawText(e).toLowerCase().includes(q)) return true; if(e.type==='tasks') return listKids(e.id).some(t=>(t.content.text||'').toLowerCase().includes(q)); return false; }
function applyFilter(){
  const bar=$('#filterbar'); const f=S.filter; const on = f && f.board===S.cur;
  document.querySelectorAll('#world .el, #inbox-list .el').forEach(n=>n.classList.remove('fdim','fhit'));
  $('#stage').classList.toggle('filtering', !!on); document.body.classList.toggle('filtering', !!on);
  if(!on){ if(bar) bar.classList.remove('show'); return; }
  const hitSet=new Set(); Object.values(S.els).forEach(e=>{ if(alive(e) && (f.ids ? f.ids.includes(e.id) : filterMatch(e,f.q))) hitSet.add(e.id); });
  const keep=new Set(hitSet); hitSet.forEach(id=>{ let p=S.els[id]; while(p && p.section!=='canvas' && p.section!=='inbox'){ p=S.els[p.parentId]; if(p) keep.add(p.id); } });
  document.querySelectorAll('#world .el, #inbox-list .el').forEach(n=>{ const id=n.dataset.id; if(hitSet.has(id)) n.classList.add('fhit'); else if(!keep.has(id)) n.classList.add('fdim'); });
  if(bar){ bar.querySelector('.fq').textContent=f.q?`“${f.q}”`:'selected cards'; bar.querySelector('.fn').textContent=hitSet.size===1?'1 match':hitSet.size+' matches'; bar.classList.add('show'); }
}
$('#filterbar .fc').onclick=()=>{ clearFilter(); };

/* ---- 4. voltar / avançar entre quadros (Milanote: ⌘[ ⌘] / ctrl+[ ctrl+]) ---- */
function navBack(){ while(S.nav.back.length){ const id=S.nav.back.pop(); if(alive(S.els[id]) && id!==S.cur){ S.nav.fwd.push(S.cur); openBoard(id,{nav:true}); return true; } } return false; }
function navFwd(){ while(S.nav.fwd.length){ const id=S.nav.fwd.pop(); if(alive(S.els[id]) && id!==S.cur){ S.nav.back.push(S.cur); openBoard(id,{nav:true}); return true; } } return false; }
document.addEventListener('keydown', ev=>{ const mod=ev.metaKey||ev.ctrlKey; if(!mod || ev.altKey) return; if(ev.code==='BracketLeft'||ev.key==='['){ if(S.editing||ev.target.closest?.('input,textarea,[contenteditable="true"]')) return; ev.preventDefault(); ev.stopPropagation(); navBack(); } else if(ev.code==='BracketRight'||ev.key===']'){ if(S.editing||ev.target.closest?.('input,textarea,[contenteditable="true"]')) return; ev.preventDefault(); ev.stopPropagation(); navFwd(); } }, true);
window.addEventListener('mouseup', ev=>{ if(ev.button===3){ ev.preventDefault(); navBack(); } else if(ev.button===4){ ev.preventDefault(); navFwd(); } });
$('#filterbar').addEventListener('pointerdown', ev=>ev.stopPropagation());

/* ---- 5. apresentação (Milanote: PresentationModePopupPanelSection + focus mode) ---- */
const PRES_KEYS={hideComments:['milanote.presentation.hide-comments',false], disableEditing:['milanote.presentation.disable-editing',false], focus:['milanote.presentation.allow-focus-mode',true]};
function presGet(k){ try{ const v=localStorage.getItem(PRES_KEYS[k][0]); return v===null?PRES_KEYS[k][1]:v==='true'; }catch{ return PRES_KEYS[k][1]; } }
function presSet(k,v){ try{ localStorage.setItem(PRES_KEYS[k][0], String(!!v)); }catch{} applyPresentSettings(); }
function applyPresentSettings(){ const on=!!S.present; document.body.classList.toggle('pres-nocomments', on&&presGet('hideComments')); document.body.classList.toggle('pres-locked', on&&presGet('disableEditing')); document.body.classList.toggle('pres-focus', on&&presGet('focus')); }
function openPresentPop(){
  const anchor=$('#present'); if(document.querySelector('.pop.ppop')){ closePop(); return; }
  closePop(); const p=document.createElement('div'); p.className='pop ppop';
  const tg=(k,l)=>`<label class="ptg"><span>${l}</span><input type="checkbox" data-k="${k}" ${presGet(k)?'checked':''}><i></i></label>`;
  p.innerHTML=`<h3>Presentation mode</h3><p class="pex">Hide the toolbars and show your board full screen. Press Esc to leave.</p><button class="pbtn">${ICONS.present||''}<span>${S.present?'Stop presenting':'Present'}</span></button><div class="ptgs">${tg('hideComments','Hide comments')}${tg('disableEditing','Disable editing')}${tg('focus','Click a card to focus')}</div>`;
  p.addEventListener('pointerdown', ev=>ev.stopPropagation());
  document.body.appendChild(p); const r=anchor.getBoundingClientRect(); p.style.top=(r.bottom+8)+'px'; p.style.left=Math.max(12,Math.min(innerWidth-292, r.right-280))+'px';
  p.querySelector('.pbtn').onclick=()=>{ closePop(); togglePresent(); };
  p.querySelectorAll('input[data-k]').forEach(i=>i.onchange=()=>presSet(i.dataset.k,i.checked));
}
document.addEventListener('pointerdown', ev=>{ const pp=document.querySelector('.pop.ppop'); if(pp && !pp.contains(ev.target) && !ev.target.closest('#present')) pp.remove(); }, true);
function canFocusEl(e){ if(!e) return false; if(['line','task','drawing','board'].includes(e.type)) return false; if(e.content?.icon && e.type!=='note') return false; if(e.type==='comment' && (e.content.collapsed||e.section==='attached')) return false; return true; }
let focusEl=null, presPan=null;
function openFocus(id){
  const e=S.els[id]; const src=nodesFor(id)[0]; if(!e||!src) return; closeFocus(true);
  const lay=document.createElement('div'); lay.id='focus'; lay.innerHTML='<div class="fov"></div>';
  const n=elNode(e); n.classList.remove('sel','editing'); n.classList.add('focused-el'); n.querySelectorAll('.rz,.atts').forEach(x=>x.remove()); n.querySelectorAll('[contenteditable]').forEach(x=>x.removeAttribute('contenteditable'));
  const w=src.offsetWidth; n.style.position='absolute'; n.style.left='0'; n.style.top='0'; n.style.width=w+'px'; n.style.transformOrigin='0 0';
  lay.appendChild(n); document.body.appendChild(lay);
  const r=src.getBoundingClientRect(); const h=n.offsetHeight||src.offsetHeight;
  const maxW=Math.min(innerWidth*0.86, Math.max(w, 900)), maxH=innerHeight*0.86; const sc=Math.max(0.2, Math.min(maxW/w, maxH/h, e.type==='image'||e.type==='link'||e.type==='file'?4:2.2));
  const tx=(innerWidth-w*sc)/2, ty=Math.max(innerHeight*0.07,(innerHeight-h*sc)/2);
  n.style.transform=`translate(${r.left}px,${r.top}px) scale(${r.width/w})`; src.style.visibility='hidden';
  requestAnimationFrame(()=>requestAnimationFrame(()=>{ lay.classList.add('on'); n.style.transform=`translate(${tx}px,${ty}px) scale(${sc})`; }));
  focusEl={id,lay,n,src,w};
  lay.addEventListener('click', ev=>{ if(ev.target.closest('.focused-el a, .focused-el button, .focused-el video, .focused-el iframe, .focused-el .mp')) return; if(ev.target.closest('.focused-el')) return; closeFocus(); });
}
function closeFocus(instant){ const f=focusEl; if(!f) return; focusEl=null; if(instant || !f.src.isConnected){ f.lay.remove(); f.src.style.visibility=''; return; } const r=f.src.getBoundingClientRect(); f.lay.classList.remove('on'); f.n.style.transform=`translate(${r.left}px,${r.top}px) scale(${r.width/f.w})`; setTimeout(()=>{ f.lay.remove(); f.src.style.visibility=''; }, 280); }
stage.addEventListener('pointerdown', ev=>{
  if(!S.present || ev.button!==0) return;
  if(ev.target.closest('a.go, .play, video, audio, iframe, .mp, .cc')) return;
  const n=ev.target.closest('.el'); const e=n&&S.els[n.dataset.id];
  if(e && e.type==='board' && presGet('disableEditing')){ ev.stopImmediatePropagation(); ev.preventDefault(); presPan={x:ev.clientX,y:ev.clientY,vx:view().x,vy:view().y,moved:false,board:e.id}; return; }
  if(e && presGet('focus') && canFocusEl(e)){ ev.stopImmediatePropagation(); ev.preventDefault(); presPan={x:ev.clientX,y:ev.clientY,vx:view().x,vy:view().y,moved:false,focus:e.id}; return; }
  if(presGet('disableEditing')){ ev.stopImmediatePropagation(); ev.preventDefault(); presPan={x:ev.clientX,y:ev.clientY,vx:view().x,vy:view().y,moved:false}; }
}, true);
window.addEventListener('pointermove', ev=>{ if(!presPan) return; const dx=ev.clientX-presPan.x, dy=ev.clientY-presPan.y; if(!presPan.moved && Math.hypot(dx,dy)<5) return; presPan.moved=true; const v=view(); v.x=presPan.vx+dx; v.y=presPan.vy+dy; applyView(); });
window.addEventListener('pointerup', ev=>{ const pp=presPan; if(!pp) return; presPan=null; if(pp.moved){ save(); return; } if(pp.board){ openBoard(pp.board); setTimeout(fitAll,30); return; } if(pp.focus) openFocus(pp.focus); });
stage.addEventListener('dblclick', ev=>{ if(S.present && presGet('disableEditing')){ ev.stopImmediatePropagation(); ev.preventDefault(); } }, true);
document.addEventListener('keydown', ev=>{
  if(focusEl && ev.key==='Escape'){ ev.preventDefault(); ev.stopPropagation(); closeFocus(); return; }
  if(S.present && presGet('disableEditing')){ const mod=ev.metaKey||ev.ctrlKey; const k=ev.key.toLowerCase(); if(['backspace','delete','enter','tab'].includes(k) || (mod && ['z','y','d','v','x','a','k','b','i','u'].includes(k)) || (!mod && ev.key.length===1 && !['z','+','-','=','0'].includes(k)) || (ev.key.startsWith('Arrow'))){ if(ev.target.closest?.('input,textarea')) return; ev.preventDefault(); ev.stopPropagation(); } }
}, true);
document.addEventListener('paste', ev=>{ if(S.present && presGet('disableEditing')){ ev.preventDefault(); ev.stopImmediatePropagation(); } }, true);
document.addEventListener('contextmenu', ev=>{ if(S.present && presGet('disableEditing') && ev.target.closest('#stage')){ ev.preventDefault(); ev.stopImmediatePropagation(); } }, true);

/* ---- 6. exportação (Milanote ExportPopupForBoard: layout PDF/PDF HQ/PNG · linear Word/Markdown/Texto · ZIP de arquivos) ---- */
const xesc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
function boardTitle(id){ return id===S.root?'Home':(S.els[id]?.content.title||'Untitled'); }
function safeName(s){ return String(s||'file').replace(/[\\/:*?"<>|]+/g,'-').trim().slice(0,80)||'file'; }
// modelo linear: [{t:'h',lvl,runs}|{t:'p',runs,style}|{t:'img',blobId,url,w,h}|{t:'table',rows}]
function htmlBlocks(html){ const d=document.createElement('div'); d.innerHTML=html||''; const out=[]; let cur=null;
  const flush=()=>{ if(cur && cur.runs.some(r=>r.t.trim())) out.push(cur); cur=null; };
  const inl=(n,f)=>{ if(n.nodeType===3){ if(!cur) cur={t:'p',runs:[]}; cur.runs.push({...f,t:n.textContent}); return; } if(n.nodeType!==1) return; const tg=n.tagName; if(tg==='BR'){ if(!cur) cur={t:'p',runs:[]}; cur.runs.push({...f,t:'\n'}); return; } const g={...f}; if(tg==='B'||tg==='STRONG') g.b=1; if(tg==='I'||tg==='EM') g.i=1; if(tg==='U') g.u=1; if(tg==='S'||tg==='STRIKE'||tg==='DEL') g.s=1; if(tg==='CODE') g.code=1; if(tg==='A') g.href=n.getAttribute('href'); if(/^(P|DIV|H[1-6]|LI|BLOCKQUOTE|PRE|UL|OL|HR)$/.test(tg)) return blk(n,f); [...n.childNodes].forEach(c=>inl(c,g)); };
  const blk=(n,f={},pre)=>{ const tg=n.tagName; if(tg==='UL'||tg==='OL'){ [...n.children].forEach((li,i)=>{ flush(); const chk=n.classList.contains('cl'); cur={t:'p',runs:[],style:'li',mark: chk?(li.classList.contains('done')?'☑ ':'☐ '):tg==='OL'?(i+1)+'. ':'• ', ind:(n.className.match(/ind(\d)/)||[])[1]|0}; [...li.childNodes].forEach(c=>inl(c,f)); flush(); }); return; }
    if(tg==='HR'){ flush(); out.push({t:'hr'}); return; }
    flush(); cur={t:/^H[1-6]$/.test(tg)?'h':'p', inner:1, lvl:tg==='H1'?2:3, runs:[], style:tg==='BLOCKQUOTE'?'quote':tg==='PRE'?'code':n.classList?.contains('callout')?'quote':null};
    [...n.childNodes].forEach(c=>inl(c,f)); flush(); };
  [...d.childNodes].forEach(c=>{ if(c.nodeType===1 && /^(P|DIV|H[1-6]|UL|OL|BLOCKQUOTE|PRE|HR)$/.test(c.tagName)) blk(c); else inl(c,{}); }); flush(); return out; }
const PB=(text,extra={})=>({t:'p',runs:[{t:text}],...extra});
function linearBlocks(bid, depth, withSub, seen=new Set()){
  if(seen.has(bid)) return []; seen.add(bid);
  const out=[{t:'h',lvl:Math.min(depth,3),runs:[{t:boardTitle(bid)}]}];
  const el=(e,d)=>{ const c=e.content; switch(e.type){
    case 'note': out.push(...htmlBlocks(c.html)); break;
    case 'link': out.push({t:'p',runs:[{t:c.title||c.preview?.title||c.url||'Link',href:c.url}]}); if(c.preview?.description) out.push(PB(c.preview.description,{style:'muted'})); break;
    case 'image': out.push({t:'img',blobId:c.blobId,url:c.url,w:c.w,h:c.h}); if(c.caption) out.push(PB(c.caption,{style:'muted'})); break;
    case 'file': out.push(PB('File: '+(c.name||'file'))); break;
    case 'swatch': out.push(PB('Color: '+c.hex)); break;
    case 'tasks': if(!c.hideTitle) out.push({t:'p',runs:[{t:c.title||'To-do',b:1}]}); listKids(e.id).forEach(t=>out.push({t:'p',style:'li',mark:t.content.done?'☑ ':'☐ ',runs:[{t:t.content.text||''}]})); break;
    case 'column': out.push({t:'h',lvl:Math.min(d+1,3),runs:[{t:c.title||'Column'}]}); listKids(e.id).forEach(k=>el(k,d+1)); break;
    case 'board': if(withSub) out.push(...linearBlocks(e.id, d+1, true, seen)); else out.push(PB('Board: '+(c.title||'Untitled'),{runs:[{t:'Board: ',b:1},{t:c.title||'Untitled'}]})); break;
    case 'comment': out.push({t:'p',style:'quote',runs:[{t:'Comment: ',b:1},{t:c.text||''}]}); break;
    case 'doc': out.push({t:'h',lvl:Math.min(d+1,3),runs:[{t:c.title||'Document'}]}); out.push(...htmlBlocks(c.html)); break;
    case 'map': out.push(PB('Location: '+(c.query||''))); break;
    case 'table': if(c.rows?.length) out.push({t:'table',rows:c.rows}); break;
  } children(e.id,'attached').forEach(k=>out.push({t:'p',style:'quote',runs:[{t:'Comment: ',b:1},{t:k.content.text||''}]})); };
  canvasKids(bid).filter(e=>e.type!=='line'&&e.type!=='drawing').sort((p,q)=>(p.y-q.y)||(p.x-q.x)).forEach(e=>el(e,depth));
  const ik=inboxKids(bid); if(ik.length){ out.push({t:'h',lvl:Math.min(depth+1,3),runs:[{t:'Unsorted'}]}); ik.forEach(e=>el(e,depth+1)); }
  return out;
}
function blocksToText(bl){ let out=''; bl.forEach((b,i)=>{ let line; if(b.t==='img') line='[Image]'; else if(b.t==='hr') line='———'; else if(b.t==='table') line=b.rows.map(r=>r.join('\t')).join('\n'); else { const txt=b.runs.map(r=>r.href&&r.t!==r.href?`${r.t} (${r.href})`:r.t).join(''); if(b.t==='h' && !b.inner) line=(b.lvl===1?txt.toUpperCase():txt)+'\n'+(b.lvl<=2?(b.lvl===1?'=':'-').repeat(Math.max(3,Math.min(60,txt.length))):''); else line=(b.style==='li'?'  '.repeat(b.ind||0)+(b.mark||'• '):'')+txt; } const prev=bl[i-1]; out+= i===0?'' : (prev&&prev.style==='li'&&b.style==='li')?'\n':'\n\n'; out+=line; }); return out.replace(/\n{3,}/g,'\n\n').trim()+'\n'; }
async function imgForDocx(b){ let blob=b.blobId?await getBlob(b.blobId):null; if(!blob && b.url){ try{ blob=await (await fetch(b.url)).blob(); }catch{} } if(!blob) return null;
  let type=blob.type; const bmp=await new Promise(res=>{ const im=new Image(); im.onload=()=>res(im); im.onerror=()=>res(null); im.src=URL.createObjectURL(blob); }); if(!bmp) return null;
  if(!/png|jpe?g|gif/.test(type)){ const cv=document.createElement('canvas'); cv.width=bmp.naturalWidth; cv.height=bmp.naturalHeight; cv.getContext('2d').drawImage(bmp,0,0); blob=await new Promise(r=>cv.toBlob(r,'image/png')); type='image/png'; }
  return {blob, ext:type.includes('png')?'png':type.includes('gif')?'gif':'jpeg', w:bmp.naturalWidth, h:bmp.naturalHeight}; }
async function blocksToDocx(bl, title){
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'); const zip=new JSZip();
  const rels=[]; let rid=10; let pic=1; const media=[];
  const run=r=>{ const pr=(r.b?'<w:b/>':'')+(r.i?'<w:i/>':'')+(r.u?'<w:u w:val="single"/>':'')+(r.s?'<w:strike/>':'')+(r.code?'<w:rFonts w:ascii="Courier New" w:hAnsi="Courier New"/>':'')+(r.href?'<w:color w:val="1F6FEB"/><w:u w:val="single"/>':''); const parts=String(r.t).split('\n'); return parts.map((t,i)=>`${i?'<w:r><w:br/></w:r>':''}<w:r>${pr?`<w:rPr>${pr}</w:rPr>`:''}<w:t xml:space="preserve">${xesc(t)}</w:t></w:r>`).join(''); };
  const runs=rs=>rs.map(r=>{ if(r.href){ const id='rId'+(rid++); rels.push(`<Relationship Id="${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="${xesc(r.href)}" TargetMode="External"/>`); return `<w:hyperlink r:id="${id}">${run(r)}</w:hyperlink>`; } return run(r); }).join('');
  let body='';
  for(const b of bl){
    if(b.t==='h'){ body+=`<w:p><w:pPr><w:pStyle w:val="Heading${b.lvl}"/></w:pPr>${runs(b.runs)}</w:p>`; continue; }
    if(b.t==='hr'){ body+='<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="BBBBBB"/></w:pBdr></w:pPr></w:p>'; continue; }
    if(b.t==='table'){ body+=`<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="0" w:type="auto"/><w:tblBorders>${['top','left','bottom','right','insideH','insideV'].map(s=>`<w:${s} w:val="single" w:sz="4" w:color="BBBBBB"/>`).join('')}</w:tblBorders></w:tblPr>${b.rows.map(r=>`<w:tr>${r.map(c=>`<w:tc><w:p>${run({t:c})}</w:p></w:tc>`).join('')}</w:tr>`).join('')}</w:tbl><w:p/>`; continue; }
    if(b.t==='img'){ const im=await imgForDocx(b); if(!im) continue; const id='rId'+(rid++); const name=`image${pic}.${im.ext}`; media.push([name,im.blob]); rels.push(`<Relationship Id="${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${name}"/>`); const maxW=6*914400; let cx=im.w*9525, cy=im.h*9525; if(cx>maxW){ cy=Math.round(cy*maxW/cx); cx=maxW; } const n=pic++;
      body+=`<w:p><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${n}" name="Picture ${n}"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${n}" name="${name}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${id}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`; continue; }
    const st=b.style==='quote'?'Quote':b.style==='code'?'Code':b.style==='muted'?'Caption':null; const lead=b.style==='li'?[{t:b.mark||'• '}]:[];
    body+=`<w:p>${st||b.style==='li'?`<w:pPr>${st?`<w:pStyle w:val="${st}"/>`:''}${b.style==='li'?`<w:ind w:left="${360+(b.ind||0)*360}" w:hanging="280"/>`:''}</w:pPr>`:''}${runs([...lead,...b.runs])}</w:p>`; }
  const W='xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"';
  zip.file('[Content_Types].xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Default Extension="jpeg" ContentType="image/jpeg"/><Default Extension="gif" ContentType="image/gif"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`);
  zip.file('_rels/.rels',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`);
  zip.file('docProps/core.xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${xesc(title)}</dc:title><dc:creator>Space</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString().slice(0,19)}Z</dcterms:created></cp:coreProperties>`);
  const sty=(id,name,ppr,rpr,based='Normal')=>`<w:style w:type="paragraph" w:styleId="${id}"><w:name w:val="${name}"/><w:basedOn w:val="${based}"/><w:next w:val="Normal"/><w:qFormat/><w:pPr>${ppr}</w:pPr><w:rPr>${rpr}</w:rPr></w:style>`;
  zip.file('word/styles.xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles ${W}><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Calibri" w:cs="Calibri"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>${sty('Heading1','heading 1','<w:keepNext/><w:spacing w:before="360" w:after="160"/><w:outlineLvl w:val="0"/>','<w:b/><w:sz w:val="36"/>')}${sty('Heading2','heading 2','<w:keepNext/><w:spacing w:before="280" w:after="120"/><w:outlineLvl w:val="1"/>','<w:b/><w:sz w:val="28"/>')}${sty('Heading3','heading 3','<w:keepNext/><w:spacing w:before="200" w:after="80"/><w:outlineLvl w:val="2"/>','<w:b/><w:sz w:val="24"/>')}${sty('Quote','Quote','<w:ind w:left="360"/><w:pBdr><w:left w:val="single" w:sz="12" w:space="8" w:color="CCCCCC"/></w:pBdr>','<w:i/><w:color w:val="555555"/>')}${sty('Code','Code','<w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/>','<w:rFonts w:ascii="Courier New" w:hAnsi="Courier New"/><w:sz w:val="20"/>')}${sty('Caption','caption','','<w:color w:val="777777"/><w:sz w:val="18"/>')}</w:styles>`);
  zip.file('word/document.xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${W}><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>`);
  zip.file('word/_rels/document.xml.rels',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>${rels.join('')}</Relationships>`);
  media.forEach(([n,b])=>zip.file('word/media/'+n,b));
  return zip.generateAsync({type:'blob',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
}
function mediaElsOf(bid){ const out=[]; const walk=pid=>Object.values(S.els).forEach(e=>{ if(e.parentId!==pid||e.trashed) return; if(e.type==='board') return; if((e.type==='image'||e.type==='file') && (e.content.blobId)) out.push(e); if(e.type==='column'||e.type==='tasks') walk(e.id); }); walk(bid); return out; }
async function mediaSize(bid){ let n=0; for(const e of mediaElsOf(bid)){ const b=await getBlob(e.content.blobId); if(b) n+=b.size; } return n; }
async function exportZip(){ const els=mediaElsOf(S.cur); if(!els.length){ toast('No files found'); return; } toast('Generating ZIP…'); await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'); const zip=new JSZip(); const used={};
  for(const e of els){ const b=await getBlob(e.content.blobId); if(!b) continue; let name=e.type==='file'?e.content.name:(e.content.name||e.content.caption||'image'); name=safeName(name); if(!/\.[a-z0-9]{2,5}$/i.test(name)){ const ext=(b.type.split('/')[1]||'bin').replace('jpeg','jpg').replace(/\+.*/,''); name+='.'+ext; } let nm=name, k=2; while(used[nm.toLowerCase()]){ nm=name.replace(/(\.[^.]+)?$/,` (${k++})$1`); } used[nm.toLowerCase()]=1; zip.file(nm,b); }
  const blob=await zip.generateAsync({type:'blob'}); await saveOut(safeName(boardTitle(S.cur))+'.zip', blob); }
async function exportPDFq(hq){ toast(hq?'Rendering high quality PDF…':'Rendering PDF…'); try{ const sc=hq?4:2; const c=await renderBoardCanvas(sc); await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'); const {jsPDF}=window.jspdf; const w=c.width/sc, h=c.height/sc; const pdf=new jsPDF({orientation:w>=h?'l':'p',unit:'px',format:[w,h],compress:true}); if(hq) pdf.addImage(c.toDataURL('image/png'),'PNG',0,0,w,h,undefined,'SLOW'); else pdf.addImage(c.toDataURL('image/jpeg',.88),'JPEG',0,0,w,h); await saveOut(`${safeName(boardTitle(S.cur))}.pdf`, pdf.output('blob')); }catch(e){ toast(e.message==='empty'?'Board is empty':'Could not render the PDF'); } }
async function exportLinear(kind, sub){ const title=boardTitle(S.cur); const fn=safeName(title);
  if(kind==='md'){ await saveOut(fn+'.md', boardToMd(S.cur,1,sub)); return; }
  const bl=linearBlocks(S.cur,1,sub);
  if(kind==='txt'){ await saveOut(fn+'.txt', blocksToText(bl)); return; }
  if(kind==='docx'){ toast('Creating Word document…'); try{ const blob=await blocksToDocx(bl,title); await saveOut(fn+'.docx', blob); }catch(e){ console.warn(e); toast('Could not create the Word document'); } }
}
function openExportPop(){
  if(document.querySelector('.pop.xpop')){ closePop(); return; } closePop();
  const p=document.createElement('div'); p.className='pop xpop';
  const n=Object.values(S.els).filter(e=>!e.trashed).length;
  p.innerHTML=`<div class="xs"><h3>Current board layout</h3><button data-x="pdf">${ICONS.file}<span>PDF (standard)</span></button><button data-x="pdfhq">${ICONS.file}<span>PDF (high quality)</span></button><button data-x="png">${ICONS.image}<span>PNG image</span></button></div>
  <div class="xs"><h3>Linear document</h3><label class="ptg"><span>Include sub-boards</span><input type="checkbox" id="xsub"><i></i></label><button data-x="docx">${ICONS.doc}<span>Word document</span></button><button data-x="md">${ICONS.ftext||ICONS.doc}<span>Markdown</span></button><button data-x="txt">${ICONS.text||ICONS.doc}<span>Plain text</span></button></div>
  <div class="xs"><h3>Download all files</h3><button data-x="zip" class="xzip">${ICONS.download}<span>Checking files…</span></button></div>
  <div class="xs"><h3>Backup</h3><p class="pex">${n} items stored on this device.</p><div class="xrow"><button data-x="backup">Export backup</button><button data-x="import">Import</button><button data-x="wipe" class="dz">Reset…</button></div></div>`;
  p.addEventListener('pointerdown', ev=>ev.stopPropagation());
  document.body.appendChild(p); const r=$('#io').getBoundingClientRect(); p.style.top=(r.bottom+8)+'px'; p.style.left=Math.max(12,Math.min(innerWidth-292, r.right-280))+'px';
  const zb=p.querySelector('.xzip'); const cnt=mediaElsOf(S.cur).length;
  if(!cnt){ zb.classList.add('disabled'); zb.querySelector('span').textContent='No files found'; } else mediaSize(S.cur).then(sz=>{ zb.querySelector('span').textContent=`Generate ZIP (${fmtSize(sz)})`; });
  p.addEventListener('click', ev=>{ const b=ev.target.closest('button[data-x]'); if(!b||b.classList.contains('disabled')) return; const x=b.dataset.x; const sub=p.querySelector('#xsub').checked;
    if(x==='wipe'){ closePop(); legacyExportModal(true); return; }
    closePop();
    if(x==='pdf') exportPDFq(false); else if(x==='pdfhq') exportPDFq(true); else if(x==='png') exportPNG(); else if(x==='zip') exportZip(); else if(x==='backup') exportAll(); else if(x==='import') $('#jsonpick').click(); else exportLinear(x,sub); });
}
document.addEventListener('pointerdown', ev=>{ const xp=document.querySelector('.pop.xpop'); if(xp && !xp.contains(ev.target) && !ev.target.closest('#io')) xp.remove(); }, true);
const legacyIoClick=$('#io').onclick; function legacyExportModal(wipe){ legacyIoClick(); if(wipe) setTimeout(()=>$('#wipe')?.click(),0); }
$('#io').onclick=openExportPop;

/* ---- 7. visualizador de arquivo (Milanote FileModal: PDF/texto em iframe nativo, mídia no player, demais = detalhe + download) ---- */
const TEXT_EXT=/\.(txt|md|markdown|csv|tsv|json|js|ts|css|html?|xml|yml|yaml|py|rb|sh|srt|vtt|log|ini|toml)$/i;
async function openFileModal(e){
  if(!e) return; const c=e.content; let blob=c.blobId?await getBlob(c.blobId):null; let url=blob?URL.createObjectURL(blob):(c.url||null);
  const name=c.name||(e.type==='image'?(c.caption||'Image'):'File'); const type=blob?.type||''; const size=blob?.size||0;
  const isPdf=/pdf/.test(type)||/\.pdf$/i.test(name), isImg=e.type==='image'||/^image\//.test(type), isVid=/^video\//.test(type)||c.kind==='video', isAud=/^audio\//.test(type)||c.kind==='audio', isTxt=/^text\//.test(type)||TEXT_EXT.test(name);
  closeFileModal(); const m=document.createElement('div'); m.id='fview';
  const ext=(name.split('.').pop()||'').slice(0,5).toUpperCase();
  m.innerHTML=`<div class="fvb"><div class="fvh"><span class="fvi">${ICONS[isImg?'image':isVid?'fvideo':isAud?'faudio':'file']||''}</span><div class="fvt"><b>${esc(name)}</b><small>${[ext&&ext!==name.toUpperCase()?ext:'', size?fmtSize(size):''].filter(Boolean).join(' · ')}</small></div><button class="fvd" ${url?'':'disabled'}>${ICONS.download}<span>Download</span></button><button class="fvx" title="Close (Esc)">${ICONS.x}</button></div><div class="fvc"></div></div>`;
  const body=m.querySelector('.fvc');
  if(!url) body.innerHTML=`<div class="fvnone">${ICONS.file}<p>File not available on this device.</p></div>`;
  else if(isImg) body.innerHTML=`<img alt="" src="${url}">`;
  else if(isPdf && blob){ body.innerHTML=`<div class="fvpages"><div class="fvload">Loading pages…</div></div>`; renderPdfInto(body.querySelector('.fvpages'), blob, url, name, m); }
  else if(isPdf) body.innerHTML=`<iframe class="fvpdf" src="${url}" title="${esc(name)}"></iframe>`;
  else if(isVid) body.innerHTML=`<video src="${url}" controls autoplay playsinline></video>`;
  else if(isAud) body.innerHTML=`<div class="fvaud">${ICONS.faudio||''}<audio src="${url}" controls autoplay></audio></div>`;
  else if(isTxt && blob){ const t=await blob.slice(0,1_000_000).text(); body.innerHTML=`<pre class="fvtxt"></pre>`; body.querySelector('pre').textContent=t; }
  else body.innerHTML=`<div class="fvnone"><div class="fiv">${ICONS.file}<small>${esc(ext)}</small></div><p>No preview available for this file type.</p></div>`;
  m.classList.toggle('wide', isPdf||isTxt); m.classList.toggle('media', isImg||isVid);
  document.body.appendChild(m); requestAnimationFrame(()=>m.classList.add('on'));
  m.addEventListener('pointerdown', ev=>{ if(ev.target===m) closeFileModal(); });
  m.querySelector('.fvx').onclick=closeFileModal;
  m.querySelector('.fvd').onclick=async()=>{ if(blob && window.__TAURI__){ const fn=/\.[a-z0-9]{2,5}$/i.test(name)?name:name+'.'+((type.split('/')[1]||'bin').replace('jpeg','jpg')); return appSave(fn, blob); } if(blob){ const dl=await (window.claude?.use?.('downloads')||null); const fn=/\.[a-z0-9]{2,5}$/i.test(name)?name:name+'.'+((type.split('/')[1]||'bin').replace('jpeg','jpg')); if(dl){ try{ await dl.save({filename:fn,data:blob}); }catch(err){ if(err?.code!=='declined') toast('Could not save'); } } else { const a=document.createElement('a'); a.href=url; a.download=fn; a.click(); } } else if(url){ window.open(url,'_blank','noopener'); } };
  m._url = blob ? url : null;
}
function closeFileModal(){ const m=$('#fview'); if(!m) return; m.querySelectorAll('video,audio').forEach(v=>v.pause()); if(m._url) setTimeout(()=>URL.revokeObjectURL(m._url),1000); m.remove(); }
document.addEventListener('keydown', ev=>{ if(ev.key==='Escape' && $('#fview')){ ev.preventDefault(); ev.stopPropagation(); closeFileModal(); } }, true);

/* ---- 8. Quick Notes (Milanote: quadro-raiz especial, popup no header com lista, contador; arrasta pra dentro e pra fora) ---- */
var QN_ID='quicknotes', qnOpen=false;
function ensureQN(){ if(!S.els[QN_ID]) S.els[QN_ID]={id:QN_ID,type:'qnroot',parentId:null,section:'root',x:0,y:0,z:0,index:0,color:null,content:{title:'Quick notes'},created:Date.now()}; }
function qnKids(){ return listKids(QN_ID); }
function updQNCount(){ const n=S.els[QN_ID]?qnKids().length:0; const c=$('#qn-count'); if(c) c.textContent=n||''; }
function renderQN(){ updQNCount(); if(!qnOpen) return; const l=$('#qn-list'); if(!l) return; const keep=l.scrollTop; l.innerHTML=''; const ks=qnKids(); ks.forEach(e=>l.appendChild(elNode(e))); $('#qn').classList.toggle('empty',!ks.length); l.scrollTop=keep; }
function openQN(){ if(qnOpen){ closeQN(); return; } closePop(); closeSearch(); ensureQN(); qnOpen=true;
  const p=document.createElement('div'); p.id='qn'; p.className='qnp';
  p.innerHTML=`<div class="qnh"><h2>Quick notes</h2><button class="qnadd" title="New note">${ICONS.plus||'+'}<span>Note</span></button></div><div id="qn-list"></div><div class="qne"><span class="qnei">${ICONS.quicknotes}</span><b>Your quick notes</b><span>Jot ideas here from any board. Drag cards in to keep them handy, or drag them out onto a board.</span></div>`;
  document.body.appendChild(p); const r=$('#qn-btn').getBoundingClientRect(); p.style.top=(r.bottom+8)+'px'; p.style.left=Math.max(12,Math.min(innerWidth-392, r.right-380))+'px';
  $('#qn-btn').classList.add('on');
  p.querySelector('.qnadd').onclick=()=>{ commit(); const e=mk('note'); e.section='list'; e.parentId=QN_ID; e.index=-1; S.els[e.id]=e; renumber(QN_ID,'list'); S.sel=new Set([e.id]); renderQN(); renderTools(); save(); startEdit(e.id,'.body'); };
  const list=p.querySelector('#qn-list');
  list.addEventListener('pointerdown', ev=>{ if(ev.button!==0) return; const tk=ev.target.closest('.task'); if(tk && !ev.target.closest('.tx,.cb,.rm')){ startTaskDrag(ev,tk); return; } const n=ev.target.closest('.el'); if(!n) return; if(ev.target.closest('a.go,.task .cb,.task .rm,.add,input,video,audio,.cc,.mp,.dl,.mpvol,iframe')) return; if(ev.target.isContentEditable||S.editing===n.dataset.id) return; const id=n.dataset.id; const wasSel=S.sel.has(id)&&S.sel.size===1; if(S.editing && S.editing!==id) stopEdit(); if(!S.sel.has(id)) select([id]); const rr=n.getBoundingClientRect(); drag={kind:'el',ids:[id],primary:id,start:{x:ev.clientX,y:ev.clientY},moved:false,off:{x:ev.clientX-rr.left,y:ev.clientY-rr.top},w:rr.width,inner:true,from:'list',pid:ev.pointerId,capEl:ev.currentTarget,alt:ev.altKey,wasSel,clickId:id}; });
  renderQN();
}
function closeQN(){ qnOpen=false; $('#qn')?.remove(); $('#qn-btn')?.classList.remove('on'); }
function qnDropTarget(ev,under){ const q=$('#qn'); if(!q || !under.some(n=>n.id==='qn')) return null; const movingTypes = drag.kind==='tool' ? [drag.type] : (drag.ids||[]).map(id=>S.els[id]?.type); if(drag.kind==='task' || movingTypes.some(t=>t==='column'||t==='line')) return {kind:'none'};
  const items=$('#qn-list'); const kids=[...items.children].filter(x=>x.classList.contains('el')&&!x.classList.contains('dragging')); let idx=kids.length; for(let i=0;i<kids.length;i++){ const r=kids[i].getBoundingClientRect(); if(ev.clientY<r.top+r.height/2){ idx=i; break; } } const ph=document.createElement('div'); ph.className='drop-ph'; if(idx>=kids.length) items.appendChild(ph); else items.insertBefore(ph,kids[idx]); q.classList.add('over'); return {kind:'qn',index:idx}; }
$('#qn-btn').onclick=openQN;
let qnDown=null;
document.addEventListener('pointerdown', ev=>{ qnDown = qnOpen && !ev.target.closest('#qn,#qn-btn,#cmenu,.pop,#modal,#fview') ? {x:ev.clientX,y:ev.clientY} : null; }, true);
document.addEventListener('pointerup', ev=>{ const d=qnDown; qnDown=null; if(d && qnOpen && Math.hypot(ev.clientX-d.x,ev.clientY-d.y)<5) closeQN(); }, true);
document.addEventListener('keydown', ev=>{ if(ev.key==='Escape' && qnOpen && !S.editing && !S.sel.size){ closeQN(); } });

/* ---- 9. documento em modal grande (Milanote DocumentModal: título no header, Export à direita, barra de texto lateral) ---- */
let docState=null;
function openDoc(e){
  if(!e) return; closeDoc(); closePop(); deselect();
  const m=document.createElement('div'); m.id='docm';
  m.innerHTML=`<div class="dmw"><div class="dmh"><div class="dml"><span class="dmi">${ICONS.doc}</span></div><input class="dmt" type="text" placeholder="Untitled document" spellcheck="false" value="${esc(e.content.title||'')}"><div class="dmr"><button class="dmexp">${ICONS.download}<span>Export</span></button><button class="dmclose" title="Close (Esc)">${ICONS.x}</button></div></div><div class="dmb"><div class="body docbody" id="dbody" contenteditable="true" spellcheck="false" data-ph="Start writing…">${e.content.html||''}</div></div></div>`;
  document.body.appendChild(m); document.body.classList.add('docmode');
  S.sel=new Set(); S.editing=e.id; renderTools(); placeDocTools();
  const b=m.querySelector('#dbody'), t=m.querySelector('.dmt'); let committed=false;
  const sync=()=>{ const html=cleanHtml(b.innerHTML), title=t.value.trim(); if(html===e.content.html && title===(e.content.title||'')) return; if(!committed){ commit(); committed=true; } e.content.html=html; e.content.title=title; touch(e.id); save(); };
  let st; const later=()=>{ clearTimeout(st); st=setTimeout(sync,400); };
  b.addEventListener('input', later); t.addEventListener('input', later);
  t.addEventListener('keydown', ev=>{ if(ev.key==='Enter'){ ev.preventDefault(); b.focus(); } });
  m.querySelector('.dmclose').onclick=()=>closeDoc();
  m.querySelector('.dmexp').onclick=ev=>{ ev.stopPropagation(); openDocExport(m.querySelector('.dmexp'), e); };
  m.addEventListener('pointerdown', ev=>{ if(ev.target===m) closeDoc(); });
  docState={e, sync, m};
  setTimeout(()=>{ if(!e.content.title) t.focus(); else { b.focus(); const r=document.createRange(); r.selectNodeContents(b); r.collapse(false); const s=getSelection(); s.removeAllRanges(); s.addRange(r); } },30);
}
function placeDocTools(){ const tl=$('#tools'), w=document.querySelector('#docm .dmw'); if(!tl||!w) return; const r=w.getBoundingClientRect(); tl.style.left=Math.max(8, r.left-tl.offsetWidth-12)+'px'; tl.style.top=(r.top+56)+'px'; }
window.addEventListener('resize', ()=>{ if(docState) placeDocTools(); });
function closeDoc(){ const d=docState; if(!d) return; docState=null; d.sync(); d.m.remove(); document.body.classList.remove('docmode'); const tl=$('#tools'); tl.style.left=''; tl.style.top=''; closePop(); S.editing=null; render(); save(); }
// "Done" na barra de texto e Esc fecham o documento
$('#tools').addEventListener('click', ev=>{ if(docState && ev.target.closest('[data-tool=done]')){ ev.stopImmediatePropagation(); closeDoc(); } }, true);
document.addEventListener('keydown', ev=>{ if(ev.key==='Escape' && docState){ if(document.querySelector('.pop')){ closePop(); ev.preventDefault(); ev.stopPropagation(); return; } ev.preventDefault(); ev.stopPropagation(); closeDoc(); } }, true);
function docBlocks(e){ return [{t:'h',lvl:1,runs:[{t:e.content.title||'Untitled document'}]}, ...htmlBlocks(e.content.html)]; }
async function exportDocPDF(e){ toast('Rendering PDF…'); try{ await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'); await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
  const w=document.createElement('div'); w.className='docprint'; w.innerHTML=`<h1 class="dpt">${esc(e.content.title||'Untitled document')}</h1><div class="body docbody">${e.content.html||''}</div>`; w.style.cssText='position:fixed;left:-10000px;top:0;width:680px;padding:48px 56px;background:#fff;color:#1d1d1f'; document.body.appendChild(w);
  const c=await html2canvas(w,{scale:2,backgroundColor:'#fff',logging:false}); w.remove();
  const {jsPDF}=window.jspdf; const pdf=new jsPDF({unit:'pt',format:'a4'}); const pw=pdf.internal.pageSize.getWidth(), ph=pdf.internal.pageSize.getHeight(); const ratio=pw/c.width; const pageH=Math.floor(ph/ratio); let y=0, first=true;
  while(y<c.height){ const h=Math.min(pageH, c.height-y); const pc=document.createElement('canvas'); pc.width=c.width; pc.height=h; pc.getContext('2d').drawImage(c,0,y,c.width,h,0,0,c.width,h); if(!first) pdf.addPage(); pdf.addImage(pc.toDataURL('image/jpeg',.92),'JPEG',0,0,pw,h*ratio); first=false; y+=h; }
  await saveOut(safeName(e.content.title||'document')+'.pdf', pdf.output('blob')); }catch(err){ console.warn(err); toast('Could not render the PDF'); } }
function openDocExport(anchor, e){ if(document.querySelector('.pop.dxpop')){ closePop(); return; } closePop(); docState?.sync();
  const p=document.createElement('div'); p.className='pop xpop dxpop'; p.innerHTML=`<div class="xs"><h3>Export document</h3><button data-x="pdf">${ICONS.file}<span>PDF</span></button><button data-x="docx">${ICONS.doc}<span>Word document</span></button><button data-x="md">${ICONS.ftext||ICONS.doc}<span>Markdown</span></button><button data-x="txt">${ICONS.text||ICONS.doc}<span>Plain text</span></button></div>`;
  p.addEventListener('pointerdown', ev=>ev.stopPropagation()); document.body.appendChild(p); const r=anchor.getBoundingClientRect(); p.style.top=(r.bottom+6)+'px'; p.style.left=Math.max(12, r.right-280)+'px'; p.style.zIndex=700;
  p.onclick=async ev=>{ const b=ev.target.closest('button[data-x]'); if(!b) return; closePop(); const x=b.dataset.x, fn=safeName(e.content.title||'document');
    if(x==='pdf') exportDocPDF(e); else if(x==='md') saveOut(fn+'.md', `# ${e.content.title||'Untitled document'}\n\n`+htmlToMd(e.content.html)+'\n'); else if(x==='txt') saveOut(fn+'.txt', blocksToText(docBlocks(e))); else if(x==='docx'){ try{ saveOut(fn+'.docx', await blocksToDocx(docBlocks(e), e.content.title||'Document')); }catch(err){ toast('Could not create the Word document'); } } };
}

/* ---- 10. barra personalizável + More (Milanote: primary tools nas preferências; desligadas ou sem espaço vão pro "More") ---- */
function toolPrefs(){ return S.meta.tools||{}; }
function toolOn(k){ const v=toolPrefs()[k]; return v===undefined ? true : !!v; }
function renderCreateTools(t){
  const items=TOOLS_CREATE; const mkTool=x=>toolBtn(x[0],x[1],x[2],{cls:['upload','image','draw'].includes(x[0])?'':'draggable',title:x[0]==='upload'?'Upload any file':x[0]==='draw'?'Draw freely on the board (D)':'Drag onto the board or click to add'});
  const sepIdx=items.indexOf(null); const primary=items.slice(0,sepIdx), secondary=items.slice(sepIdx+1);
  let shownP=primary.filter(x=>toolOn(x[0])), shownS=secondary.filter(x=>toolOn(x[0]));
  let collapsed=[...primary.filter(x=>!toolOn(x[0])), ...secondary.filter(x=>!toolOn(x[0]))];
  const build=()=>{ t.innerHTML=''; shownP.forEach(x=>t.appendChild(mkTool(x))); if(collapsed.length){ const more=toolBtn('cmore','More','ellipsis',{title:'More tools'}); t.appendChild(more); } t.appendChild(sep()); shownS.forEach(x=>t.appendChild(mkTool(x))); };
  build();
  // sem espaço: recolhe do fim da lista primária pro More (ordem de colapso do Milanote)
  let guard=30; while(t.scrollHeight>t.clientHeight+1 && guard--){ if(!collapsed.length){ collapsed.unshift(shownP.pop()); build(); continue; } if(shownP.length>3){ collapsed.unshift(shownP.pop()); } else if(shownS.length){ collapsed.push(shownS.pop()); } else break; build(); }
  t._collapsed=collapsed;
}
let moreFrom=null;
function openMorePop(anchor){
  if(document.querySelector('.pop.mpop')){ closePop(); return; }
  const list=$('#tools')._collapsed||[];
  const p=openPop(anchor, `${list.length?`<div class="mgrid">${list.map(x=>`<div class="tool mtool${['upload','image','draw'].includes(x[0])?'':' draggable'}" data-mtool="${x[0]}" title="${x[1]}"><i>${ICONS[x[2]]||''}</i><span>${x[1]}</span></div>`).join('')}</div>`:'<p class="mnone">All tools are on the toolbar.</p>'}<button class="mcust">${ICONS.sliders||''}<span>Customize toolbar…</span></button>`, 'mpop');
  p.addEventListener('pointerdown', ev=>{ const m=ev.target.closest('.mtool.draggable'); if(!m||ev.button!==0) return; drag={kind:'tool',type:m.dataset.mtool,start:{x:ev.clientX,y:ev.clientY},moved:false,off:{x:20,y:20},w:typeWidth(m.dataset.mtool),pid:ev.pointerId,capEl:m,fromMore:true}; });
  p.addEventListener('click', ev=>{ if(drag&&drag.moved) return; const m=ev.target.closest('.mtool'); if(m){ const k=m.dataset.mtool; closePop(); if(k==='upload') $('#anypick').click(); else if(k==='image'){ pickFor=null; $('#filepick').click(); } else if(k==='draw') toggleDraw(); else createFromTool(k,null); return; } if(ev.target.closest('.mcust')){ closePop(); openToolbarSettings(); } });
}
window.addEventListener('pointermove', ev=>{ if(drag && drag.fromMore && drag.moved && document.querySelector('.pop.mpop')) closePop(); });
$('#tools').addEventListener('click', ev=>{ const t=ev.target.closest('.tool[data-tool=cmore]'); if(!t) return; ev.stopImmediatePropagation(); openMorePop(t); }, true);
function openToolbarSettings(){
  const all=TOOLS_CREATE.filter(Boolean);
  modal(`<h2>Toolbar</h2><p>Choose which tools appear on the main toolbar. Hidden tools stay available in <b>More</b>.</p><div class="tbgrid">${all.map(x=>`<button class="tbopt${toolOn(x[0])?' on':''}" data-k="${x[0]}"><i>${ICONS[x[2]]||''}</i><span>${x[1]}</span></button>`).join('')}</div><div class="row"><button class="btn" id="tbreset">Reset to default</button><button class="btn pri" id="tbdone">Done</button></div>`,'tbset');
  const box=$('#modal'); box.querySelectorAll('.tbopt').forEach(b=>b.onclick=()=>{ const k=b.dataset.k; const v=!toolOn(k); S.meta.tools={...toolPrefs(),[k]:v}; b.classList.toggle('on',v); renderTools(); save(); });
  $('#tbreset').onclick=()=>{ S.meta.tools={}; box.querySelectorAll('.tbopt').forEach(b=>b.classList.add('on')); renderTools(); save(); };
  $('#tbdone').onclick=closeModal;
}
window.addEventListener('resize', ()=>{ if(S.mode==='create') renderTools(); });
$('#tools').addEventListener('contextmenu', ev=>{ if(S.mode!=='create') return; ev.preventDefault(); ev.stopPropagation(); closePop(); const p=document.createElement('div'); p.className='pop tbctx'; p.innerHTML=`<button>${ICONS.sliders||''}<span>Customize toolbar…</span></button>`; document.body.appendChild(p); p.style.left=ev.clientX+'px'; p.style.top=ev.clientY+'px'; p.addEventListener('pointerdown', e=>e.stopPropagation()); p.querySelector('button').onclick=()=>{ closePop(); openToolbarSettings(); }; setTimeout(()=>document.addEventListener('pointerdown', ()=>p.remove(), {once:true}),0); });

/* ---- PDF: miniatura da 1ª página no cartão + páginas no visualizador (pdf.js; Milanote mostra a prévia do PDF) ---- */
const PDFJS='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js', PDFJS_W='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
let pdfReady=null;
function loadPdfJs(){ if(!pdfReady) pdfReady=(async()=>{ await loadScript(PDFJS); await loadScript(PDFJS_W); const L=window.pdfjsLib; L.GlobalWorkerOptions.workerSrc = window.__SPACE_APP ? 'libs/pdf.worker.min.js' : PDFJS_W; return L; })().catch(err=>{ pdfReady=null; throw err; }); return pdfReady; }
const isPdfFile=c=>/\.pdf$/i.test(c?.name||'')||/pdf/i.test(c?.mime||'');
async function pdfOpen(blob){ const L=await loadPdfJs(); return L.getDocument({data:new Uint8Array(await blob.arrayBuffer()), isEvalSupported:false}).promise; }
async function renderPdfPage(doc,n,width){ const pg=await doc.getPage(n); const v1=pg.getViewport({scale:1}); const vp=pg.getViewport({scale:width/v1.width}); const cv=document.createElement('canvas'); cv.width=Math.round(vp.width); cv.height=Math.round(vp.height); await pg.render({canvasContext:cv.getContext('2d'),viewport:vp}).promise; return cv; }
const pdfThumbBusy=new Set();
async function ensurePdfThumb(e){ const c=e.content; if(c.thumb||c.thumbFail||pdfThumbBusy.has(e.id)||!c.blobId) return; pdfThumbBusy.add(e.id);
  try{ const b=await getBlob(c.blobId); if(!b) return; const doc=await pdfOpen(b); c.pages=doc.numPages; const cv=await renderPdfPage(doc,1,680); const jpg=await new Promise(r=>cv.toBlob(r,'image/jpeg',.88)); const id=uid(); await putBlob(id,jpg); c.thumb=id; c.thumbRatio=cv.height/cv.width; save(); if(S.els[e.id]) refreshEl(e.id); }
  catch(err){ console.warn('pdf preview', err); c.thumbFail=true; }
  finally{ pdfThumbBusy.delete(e.id); } }
function decoratePdf(n,e){ const c=e.content; if(c.icon || !isPdfFile(c)) return; n.classList.add('pdf');
  const fr=n.querySelector('.fr'); if(!fr) return; const pv=document.createElement('div'); pv.className='fpv'; pv.title='Double-click to open';
  if(c.thumb){ pv.innerHTML=`<img alt="" draggable="false">${c.pages>1?`<span class="fpn">${c.pages} pages</span>`:''}`; if(c.thumbRatio) pv.querySelector('img').style.aspectRatio=`1/${c.thumbRatio}`; blobUrl(c.thumb).then(u=>{ const im=pv.querySelector('img'); if(u&&im) im.src=u; }); }
  else { pv.innerHTML=`<div class="fpph">${ICONS.file}<span>${c.thumbFail?'No preview':'PDF'}</span></div>`; if(!c.thumbFail) setTimeout(()=>ensurePdfThumb(e),30); }
  fr.parentNode.insertBefore(pv, fr); const fd=n.querySelector('.fdoc'); if(fd && !fd.innerHTML.trim()) fd.innerHTML=ICONS.ftext||ICONS.file; }
async function renderPdfInto(box, blob, url, name, modalEl){
  try{ const doc=await pdfOpen(blob); box.innerHTML=''; const sub=modalEl?.querySelector('.fvt small'); if(sub) sub.textContent=[sub.textContent, doc.numPages+(doc.numPages===1?' page':' pages')].filter(Boolean).join(' · ');
    const w=Math.min(900, box.clientWidth-48||860), dpr=Math.min(2, window.devicePixelRatio||1);
    for(let i=1;i<=Math.min(doc.numPages,80);i++){ if(!box.isConnected) return; const cv=await renderPdfPage(doc,i,w*dpr); cv.style.width=w+'px'; cv.className='fvpage'; box.appendChild(cv); }
    if(doc.numPages>80){ const more=document.createElement('p'); more.className='fvload'; more.textContent=`Showing 80 of ${doc.numPages} pages. Download to see the rest.`; box.appendChild(more); }
  }catch(err){ console.warn('pdf view', err); box.outerHTML=`<iframe class="fvpdf" src="${url}" title="${esc(name)}"></iframe>`; } }

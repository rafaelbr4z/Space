/* ============ app de desktop (Tauri) — só age quando window.__TAURI__ existe ============ */
async function appSave(filename, data){
  try{
    const T=window.__TAURI__; const path=await T.dialog.save({defaultPath:filename, title:'Save'}); if(!path) return;
    const blob = data instanceof Blob ? data : new Blob([data]);
    await T.fs.writeFile(path, new Uint8Array(await blob.arrayBuffer()));
    toast('Saved');
  }catch(e){ console.warn('appSave', e); toast('Could not save: '+(e?.message||e)); }
}
function appOpenUrl(url){ try{ window.__TAURI__.opener.openUrl(url); }catch(e){ console.warn('openUrl', e); } }
if(window.__TAURI__){
  document.documentElement.classList.add('is-app');
  // links externos abrem no navegador padrão
  document.addEventListener('click', ev=>{ const a=ev.target.closest?.('a[href]'); if(!a) return; const href=a.getAttribute('href')||''; if(/^(https?:|mailto:)/i.test(href) && !href.startsWith(location.origin)){ ev.preventDefault(); ev.stopPropagation(); appOpenUrl(href); } }, true);
  const nativeOpen=window.open; window.open=(url,...rest)=>{ if(url && /^(https?:|mailto:)/i.test(String(url))){ appOpenUrl(String(url)); return null; } return nativeOpen.call(window,url,...rest); };
  // Esc sai da tela cheia nativa junto com a apresentação
  document.addEventListener('fullscreenchange', ()=>{});
}

/* ---- atualização dentro do app (tauri-plugin-updater; baixa de github.com/rafaelbr4z/space-releases, assinado) ---- */
var UPD={ busy:false, last:0 };
function spaceVersion(){ return window.__SPACE_VERSION||''; }
// linha "Space 0.9.x · Check for Updates" no modal de atalhos
function updHelpRow(){ const box=$('#modal-box'); if(!box || box.querySelector('.hver')) return; const r=document.createElement('div'); r.className='hver';
  r.innerHTML=`<span>Space ${esc(spaceVersion())}${window.__TAURI__?'':' · preview'}</span>${window.__TAURI__?'<button class="btn" id="hupd">Check for Updates…</button>':''}`;
  const h=box.querySelector('h2'); h ? h.after(r) : box.prepend(r); const b=r.querySelector('#hupd'); if(b) b.onclick=()=>{ closeModal(); checkUpdates(true); }; }
async function checkUpdates(manual){
  const T=window.__TAURI__; if(!T?.updater){ if(manual) toast('Updates work in the desktop app'); return; }
  if(UPD.busy) return; UPD.busy=true; UPD.last=Date.now(); if(manual) toast('Checking for updates…');
  try{ const u=await T.updater.check(); UPD.busy=false;
    if(u) showUpdateBar(u); else if(manual) toast('Space '+spaceVersion()+' is up to date');
  }catch(e){ UPD.busy=false; console.warn('update check', e); if(manual) toast('Could not check for updates. Are you online?'); }
}
function showUpdateBar(u){ $('#updbar')?.remove(); const b=document.createElement('div'); b.id='updbar';
  b.innerHTML=`<div class="ut"><b>Space ${esc(u.version)} is available</b><small>You have ${esc(spaceVersion())}. Your boards stay as they are.</small></div><button class="btn ul">Later</button><button class="btn uu">Update</button>`;
  document.body.appendChild(b); b.querySelector('.ul').onclick=()=>b.remove(); b.querySelector('.uu').onclick=()=>installUpdate(u,b); }
async function installUpdate(u,b){ UPD.busy=true; b.classList.add('busy');
  b.innerHTML='<div class="ut"><b>Downloading Space '+esc(u.version)+'…</b><small class="up">Starting</small></div><div class="ubar"><i></i></div>';
  let total=0, got=0; const pct=b.querySelector('.up'), bar=b.querySelector('.ubar i');
  try{ clearTimeout(saveT); await saveDoc();
    await u.downloadAndInstall(ev=>{ if(ev.event==='Started'){ total=ev.data.contentLength||0; }
      else if(ev.event==='Progress'){ got+=ev.data.chunkLength||0; const p=total?Math.min(100,Math.round(got/total*100)):0; pct.textContent=total?p+'%':(got/1048576).toFixed(1)+' MB'; bar.style.width=(total?p:60)+'%'; }
      else if(ev.event==='Finished'){ bar.style.width='100%'; pct.textContent='Installing…'; } });
    b.querySelector('.ut b').textContent='Restarting Space…'; pct.textContent='';
    await window.__TAURI__.process.relaunch(); UPD.busy=false;
  }catch(e){ UPD.busy=false; console.warn('update', e); b.remove(); toast('Update failed: '+(e?.message||e)); }
}
if(window.__TAURI__?.updater){ setTimeout(()=>checkUpdates(false), 6000); setInterval(()=>{ if(Date.now()-UPD.last>6*3600e3) checkUpdates(false); }, 30*60e3); }

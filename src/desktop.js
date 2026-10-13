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

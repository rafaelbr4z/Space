import { chromium } from '/home/claude/.npm-global/lib/node_modules/playwright/index.mjs';
const url = 'file://' + process.cwd() + '/test/index.html';
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1400, height: 900 } });
await ctx.grantPermissions(['clipboard-read', 'clipboard-write']);
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
const res = []; const ok = (n, c, info = '') => { res.push([c ? 'PASS' : 'FAIL', n, info]); };
await p.goto(url); await p.waitForTimeout(600);
const ev = (f, a) => p.evaluate(f, a);
// fresh empty board helper
const fresh = async () => { await ev(() => { const s = window.__space; const S = s.S; const b = s.mk('board', { x: 600, y: 600, content: { title: 'T', cover: null, emoji: null, bg: null } }); S.els[b.id] = b; S.cur = b.id; S.sel.clear(); s.render(); }); await p.waitForTimeout(150); };
const mkAt = (type, x, y, extra = {}) => ev(([type, x, y, extra]) => { const s = window.__space; const e = s.mk(type, { x, y, ...extra }); s.addEl(e); if (type === 'tasks') { const t = s.mk('task', { parentId: e.id, section: 'list', index: 0, content: { text: 'one', done: false } }); s.S.els[t.id] = t; } s.render(); return e.id; }, [type, x, y, extra]);
const center = id => p.evaluate(id => { const n = document.querySelector(`#world .el[data-id="${id}"]`); const r = n.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + Math.min(r.height / 2, 30) }; }, id);
const sel = ids => ev(ids => { const s = window.__space; s.S.sel = new Set(ids); s.render(); }, ids);
const menuItems = () => ev(() => [...document.querySelectorAll('#cmenu button .lb, #cmenu .meta')].map(x => x.textContent));
const toolNames = () => ev(() => [...document.querySelectorAll('#tools .tool span')].map(s => s.textContent));
const attNode = id => `#world .el.attc[data-id="${id}"]`;

// ===== 1. attached comments
await fresh();
const card = await mkAt('note', 100, 100, { content: { html: '<p>Card</p>' } });
await sel([card]);
ok('card toolbar has Comment', (await toolNames()).includes('Comment'));
await p.click('#tools [data-tool=acomment]'); await p.waitForTimeout(100);
await p.keyboard.type('hello there'); await p.keyboard.press('Escape'); await p.waitForTimeout(100);
let st = await ev(() => { const S = window.__space.S; const c = Object.values(S.els).find(e => e.type === 'comment' && e.section === 'attached'); return c && { pid: c.parentId, text: c.content.text, id: c.id }; });
ok('Comment tool attaches comment to card', st && st.pid === card && st.text === 'hello there', JSON.stringify(st));
const cid = st.id; await sel([]);
ok('attached comment renders as bubble on card edge', await ev(([cid, card]) => { const n = document.querySelector(`#world .el.attc[data-id="${cid}"]`); const c = document.querySelector(`#world > .el[data-id="${card}"]`); if (!n || !c) return false; const a = n.getBoundingClientRect(), b = c.getBoundingClientRect(); return Math.abs(a.left - (b.right - 14 * window.__space.view().z)) < 6 && a.width < 40; }, [cid, card]));
// move card -> comment follows
await sel([]); const c0 = await center(card); await p.mouse.move(c0.x, c0.y); await p.mouse.down(); await p.mouse.move(c0.x + 100, c0.y + 50, { steps: 6 }); await p.mouse.up(); await p.waitForTimeout(100);
ok('comment follows card when card moves', await ev(([cid, card]) => { const n = document.querySelector(`#world .el.attc[data-id="${cid}"]`); const c = document.querySelector(`#world > .el[data-id="${card}"]`); return !!n && c.contains(n); }, [cid, card]));
// click bubble selects comment and expands
const bb = await ev(cid => { const r = document.querySelector(`#world .el.attc[data-id="${cid}"]`).getBoundingClientRect(); return { x: r.left + 15, y: r.top + 15 }; }, cid);
await p.mouse.click(bb.x, bb.y); await p.waitForTimeout(100);
ok('click bubble selects the comment', await ev(cid => window.__space.S.sel.has(cid) && window.__space.S.sel.size === 1, cid));
ok('selected attached comment expands', await ev(cid => document.querySelector(`#world .el.attc[data-id="${cid}"]`).getBoundingClientRect().width > 150, cid));
const tn = await toolNames();
ok('attached comment toolbar = Color, Detach, Collapse', ['Color', 'Detach'].every(x => tn.includes(x)) && tn.some(x => x === 'Expand' || x === 'Collapse'), tn.join('|'));
await p.click('#tools [data-tool=detach]'); await p.waitForTimeout(100);
st = await ev(cid => { const e = window.__space.S.els[cid]; return { s: e.section, p: e.parentId === window.__space.S.cur, x: e.x }; }, cid);
ok('Detach puts comment back on canvas beside card', st.s === 'canvas' && st.p, JSON.stringify(st));
// drag comment onto card with hover delay -> attach
await sel([]); await p.waitForTimeout(50);
const cc = await center(cid); const cardC = await center(card);
await p.mouse.move(cc.x, cc.y); await p.mouse.down(); await p.mouse.move(cardC.x, cardC.y, { steps: 8 }); await p.waitForTimeout(650); await p.mouse.move(cardC.x + 1, cardC.y + 1);
ok('hovering card shows attach highlight', await ev(card => document.querySelector(`#world > .el[data-id="${card}"]`).classList.contains('attach-over'), card));
await p.mouse.up(); await p.waitForTimeout(100);
ok('drop after hover attaches comment', await ev(([cid, card]) => { const e = window.__space.S.els[cid]; return e.section === 'attached' && e.parentId === card; }, [cid, card]));
// quick drop over card without waiting does NOT attach
const det = await ev(cid => { const s = window.__space; s.commit(); const e = s.S.els[cid]; e.section = 'canvas'; e.parentId = s.S.cur; e.x = 700; e.y = 400; s.render(); }, cid);
const cc2 = await center(cid); const cardC2 = await center(card);
await p.mouse.move(cc2.x, cc2.y); await p.mouse.down(); await p.mouse.move(cardC2.x, cardC2.y, { steps: 5 }); await p.mouse.up(); await p.waitForTimeout(100);
ok('quick drop over card stays on canvas', await ev(cid => window.__space.S.els[cid].section === 'canvas', cid));
// attached comment trashed with card hidden; undo restores
await ev(([cid, card]) => { const s = window.__space; const e = s.S.els[cid]; e.section = 'attached'; e.parentId = card; s.render(); }, [cid, card]);
// drag bubble out to canvas detaches
const bb2 = await ev(cid => { const r = document.querySelector(`#world .el.attc[data-id="${cid}"]`).getBoundingClientRect(); return { x: r.left + 15, y: r.top + 15 }; }, cid);
await p.mouse.move(bb2.x, bb2.y); await p.mouse.down(); await p.mouse.move(bb2.x + 300, bb2.y + 250, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(100);
ok('dragging bubble to empty canvas detaches', await ev(cid => window.__space.S.els[cid].section === 'canvas', cid));

// ===== 2. multi-drag from inside a column
await fresh();
const col = await mkAt('column', 100, 100, { content: { title: 'Col', collapsed: false } });
const colB = await mkAt('column', 700, 100, { content: { title: 'ColB', collapsed: false } });
const kids = await ev(col => { const s = window.__space; const ids = []; ['A', 'B', 'C', 'D'].forEach((t, i) => { const e = s.mk('note', { parentId: col, section: 'list', index: i, content: { html: '<p>' + t + '</p>' } }); s.S.els[e.id] = e; ids.push(e.id); }); s.render(); return ids; }, col);
const kc = id => ev(id => { const r = document.querySelector(`#world .el[data-id="${id}"]`).getBoundingClientRect(); return { x: r.left + 40, y: r.top + r.height / 2 }; }, id);
let k1 = await kc(kids[1]); await p.mouse.click(k1.x, k1.y); let k2 = await kc(kids[2]); await p.keyboard.down('Shift'); await p.mouse.click(k2.x, k2.y); await p.keyboard.up('Shift');
ok('shift-click selects two cards in column', await ev(ids => { const S = window.__space.S; return S.sel.size === 2 && ids.every(i => S.sel.has(i)); }, [kids[1], kids[2]]));
k1 = await kc(kids[1]); await p.mouse.move(k1.x, k1.y); await p.mouse.down(); await p.mouse.move(k1.x + 200, k1.y + 20, { steps: 4 }); await p.mouse.move(k1.x + 350, k1.y + 300, { steps: 6 });
ok('ghost shows both dragged cards', await ev(() => document.querySelectorAll('#ghost .el').length === 2));
await p.mouse.up(); await p.waitForTimeout(100);
st = await ev(ids => { const S = window.__space.S; const a = S.els[ids[0]], b = S.els[ids[1]]; return { s: [a.section, b.section], dy: b.y - a.y, dx: b.x - a.x }; }, [kids[1], kids[2]]);
ok('both cards land on canvas keeping layout', st.s.join() === 'canvas,canvas' && st.dx === 0 && st.dy > 20, JSON.stringify(st));
ok('column keeps the other two in order', await ev(([col, a, d]) => { const s = window.__space; const k = s.listKids(col).map(e => e.id); return k.length === 2 && k[0] === a && k[1] === d; }, [col, kids[0], kids[3]]));
// drag both into column B
await sel([kids[1], kids[2]]); k1 = await kc(kids[1]);
const cb = await ev(id => { const r = document.querySelector(`#world .el[data-id="${id}"] .items`).getBoundingClientRect(); return { x: r.left + 60, y: r.top + 10 }; }, colB);
await p.mouse.move(k1.x, k1.y); await p.mouse.down(); await p.mouse.move(cb.x, cb.y, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(100);
ok('two canvas cards dropped into column in order', await ev(([colB, b, c]) => { const k = window.__space.listKids(colB).map(e => e.id); return k.join() === [b, c].join(); }, [colB, kids[1], kids[2]]));
// reorder: move first column card + D from col A into col B top
await sel([kids[0], kids[3]]); k1 = await kc(kids[0]);
const cbt = await ev(id => { const r = document.querySelector(`#world .el[data-id="${id}"] .items .el`).getBoundingClientRect(); return { x: r.left + 60, y: r.top + 4 }; }, colB);
await p.mouse.move(k1.x, k1.y); await p.mouse.down(); await p.mouse.move(cbt.x, cbt.y, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(100);
ok('cards from column go to top of other column', await ev(([colB, ids]) => { const k = window.__space.listKids(colB).map(e => e.id); return k.join() === [ids[0], ids[3], ids[1], ids[2]].join(); }, [colB, kids]), await ev(colB => window.__space.listKids(colB).map(e => e.content.html).join(), colB));

// ===== 3. search
const ids3 = await ev(() => { const s = window.__space, S = s.S; const mkB = (t, pid) => { const b = s.mk('board', { parentId: pid, x: 100, y: 100, content: { title: t, cover: null, emoji: null, bg: null } }); S.els[b.id] = b; return b.id; };
  const A = mkB('Fruit Ideas', S.root); const B = mkB('Bakery', A);
  const n1 = s.mk('note', { parentId: A, x: 300, y: 100, content: { html: '<p>banana split dessert</p>' } }); S.els[n1.id] = n1;
  const n2 = s.mk('note', { parentId: A, x: 300, y: 300, content: { html: '<p>strawberry</p>' } }); S.els[n2.id] = n2;
  const n3 = s.mk('note', { parentId: B, x: 100, y: 300, content: { html: '<p>banana bread recipe</p>' } }); S.els[n3.id] = n3;
  s.render(); return { A, B, n1: n1.id, n2: n2.id, n3: n3.id }; });
const ob = id => ev(id => window.__space.openBoard(id), id);
await ob(ids3.B); await p.waitForTimeout(20); await ob(ids3.A); await p.waitForTimeout(20);
await p.click('#search'); await p.waitForTimeout(150);
let sp = await ev(() => { const p = document.querySelector('.spanel'); return p && { boards: [...p.querySelectorAll('.sb-t')].map(x => x.textContent), dates: [...p.querySelectorAll('.sdate')].map(x => x.textContent), focus: document.activeElement?.id }; });
ok('search opens as panel with recent boards (empty query)', sp && sp.boards[0] === 'Fruit Ideas' && sp.boards.includes('Bakery') && sp.focus === 'sq', JSON.stringify(sp));
await p.keyboard.type('banana'); await p.waitForTimeout(100);
sp = await ev(() => { const p = document.querySelector('.spanel'); return { boards: [...p.querySelectorAll('.sb-t')].map(x => x.textContent), hits: [...p.querySelectorAll('.shit .mt')].map(x => x.textContent), marks: p.querySelectorAll('mark').length, count: p.querySelector('.scount').textContent }; });
ok('query groups hits by board with highlights', sp.boards.join() === 'Fruit Ideas,Bakery' && sp.hits.some(h => h.includes('banana split')) && sp.hits.some(h => h.includes('banana bread')) && sp.marks >= 2, JSON.stringify(sp));
ok('result count shown', sp.count === '2 matches', sp.count);
ok('current board filtered live (non-matches dimmed)', await ev(ids => { const a = document.querySelector(`#world .el[data-id="${ids.n1}"]`), b = document.querySelector(`#world .el[data-id="${ids.n2}"]`); return a.classList.contains('fhit') && b.classList.contains('fdim') && document.querySelector('#filterbar').classList.contains('show'); }, ids3));
await p.keyboard.press('ArrowDown'); await p.keyboard.press('ArrowDown'); await p.keyboard.press('ArrowDown');
const foc = await ev(() => document.querySelector('.spanel .nav.focused')?.className);
ok('arrow keys move focus through results', foc && foc.includes('sb-row'), foc);
await p.keyboard.press('Enter'); await p.waitForTimeout(150);
ok('Enter opens focused board with filter kept', await ev(ids => { const S = window.__space.S; return S.cur === ids.B && !document.querySelector('.spanel') && S.filter && S.filter.q === 'banana' && document.querySelector(`#world .el[data-id="${ids.n3}"]`).classList.contains('fhit'); }, ids3));
await p.click('#filterbar .fc'); await p.waitForTimeout(50);
ok('Clear removes filter', await ev(() => !window.__space.S.filter && !document.querySelector('#world .el.fdim')));
// inner hit click navigates and selects element
await p.click('#search'); await p.waitForTimeout(100); await p.keyboard.type('strawberry'); await p.waitForTimeout(80);
await p.click('.spanel .shit'); await p.waitForTimeout(150);
ok('clicking an inner hit opens board and selects card', await ev(ids => { const S = window.__space.S; return S.cur === ids.A && S.sel.has(ids.n2); }, ids3));
await p.click('#search'); await p.waitForTimeout(100); await p.keyboard.type('zzqx'); await p.waitForTimeout(80);
ok('no results message', await ev(() => !!document.querySelector('.spanel .snone b')));
await p.keyboard.press('Escape'); await p.waitForTimeout(50);
ok('Esc closes search', await ev(() => !document.querySelector('.spanel')));
await ev(() => { window.__space.S.filter = null; window.__space.render(); });

// ===== 4. back / forward
await ob(ids3.A); await ob(ids3.B); await ev(() => document.activeElement.blur());
await p.keyboard.press('Control+BracketLeft'); await p.waitForTimeout(60);
ok('ctrl+[ goes back', await ev(id => window.__space.S.cur === id, ids3.A));
await p.keyboard.press('Control+BracketRight'); await p.waitForTimeout(60);
ok('ctrl+] goes forward', await ev(id => window.__space.S.cur === id, ids3.B));
await p.keyboard.press('Control+BracketLeft'); await p.keyboard.press('Control+BracketLeft'); await p.waitForTimeout(60);
ok('back twice walks history', await ev(() => window.__space.S.nav.fwd.length === 2));

// ===== 5. presentation
await fresh();
const pn = await mkAt('note', 200, 200, { content: { html: '<p>Present me</p>' } });
const pcm = await mkAt('comment', 600, 200, { content: { text: 'hidden?', at: Date.now() } });
await ev(() => { try { localStorage.clear(); } catch {} });
await ev(() => document.querySelector('#present').click()); await p.waitForTimeout(100);
let pp = await ev(() => { const p = document.querySelector('.pop.ppop'); return p && { t: p.querySelector('h3').textContent, tg: [...p.querySelectorAll('.ptg span')].map(x => x.textContent), on: [...p.querySelectorAll('input')].map(i => i.checked) }; });
ok('present button opens settings panel', pp && pp.t === 'Presentation mode' && pp.tg.join() === 'Hide comments,Disable editing,Click a card to focus' && pp.on.join() === 'false,false,true', JSON.stringify(pp));
await p.click('.ppop .ptg:nth-child(1)'); await p.click('.ppop .ptg:nth-child(2)'); await p.click('.ppop .pbtn'); await p.waitForTimeout(250);
ok('presentation hides chrome and comments', await ev(() => { const S = window.__space.S; return S.present && getComputedStyle(document.querySelector('#hdr')).display === 'none' && !document.querySelector('#world .el.comment').offsetParent; }));
let pc = await center(pn); await p.mouse.dblclick(pc.x + 200, pc.y + 150); await p.waitForTimeout(100);
ok('editing disabled: dblclick does not create note', await ev(() => window.__space.canvasKids(window.__space.S.cur).length === 2));
pc = await center(pn); await p.mouse.click(pc.x, pc.y); await p.waitForTimeout(400);
ok('click card opens focus mode zoomed', await ev(() => { const f = document.querySelector('#focus.on .focused-el'); return !!f && f.getBoundingClientRect().width > 500; }));
await p.keyboard.press('Escape'); await p.waitForTimeout(350);
ok('Esc closes focus first (still presenting)', await ev(() => !document.querySelector('#focus') && window.__space.S.present));
const before = await ev(() => window.__space.view().x); await p.mouse.move(700, 600); await p.mouse.down(); await p.mouse.move(800, 650, { steps: 5 }); await p.mouse.up();
ok('drag background pans in presentation', await ev(b => window.__space.view().x !== b, before));
await p.keyboard.press('Backspace'); ok('Backspace blocked while locked', await ev(() => window.__space.canvasKids(window.__space.S.cur).length === 2));
await p.keyboard.press('Escape'); await p.waitForTimeout(100);
ok('Esc leaves presentation', await ev(() => !window.__space.S.present && !document.body.classList.contains('pres-locked')));
await ev(() => { try { localStorage.clear(); } catch {} });

// ===== 6. export
await p.route('https://cdnjs.cloudflare.com/**', r => { const f = r.request().url().split('/').pop(); r.fulfill({ path: '/home/claude/space/vendor/libs/' + f, contentType: 'application/javascript' }); });
await fresh();
await ev(() => { const s = window.__space; const S = s.S; const n = s.mk('note', { x: 100, y: 100, content: { html: '<h1>Big title</h1><p>Hello <b>bold</b> <a href="https://example.com">link</a></p><ul><li>one</li><li>two</li></ul>' } }); s.addEl(n);
  const t = s.mk('tasks', { x: 500, y: 100, content: { title: 'Todo' } }); s.addEl(t); const k = s.mk('task', { parentId: t.id, section: 'list', index: 0, content: { text: 'buy milk', done: true } }); S.els[k.id] = k;
  const tb = s.mk('table', { x: 100, y: 400, content: { rows: [['a', 'b'], ['c', 'd']] } }); s.addEl(tb);
  const sub = s.mk('board', { x: 800, y: 100, content: { title: 'Sub board' } }); s.addEl(sub); const sn = s.mk('note', { parentId: sub.id, x: 0, y: 0, content: { html: '<p>inside sub</p>' } }); S.els[sn.id] = sn; s.render(); });
// image blob for zip/docx
await ev(async () => { const s = window.__space; const cv = document.createElement('canvas'); cv.width = 40; cv.height = 30; cv.getContext('2d').fillRect(0, 0, 40, 30); const blob = await new Promise(r => cv.toBlob(r, 'image/png')); const id = 'blobtest1'; await new Promise((res, rej) => { const rq = indexedDB.open('space-db'); rq.onsuccess = () => { const tx = rq.result.transaction('blobs', 'readwrite'); tx.objectStore('blobs').put(blob, id); tx.oncomplete = res; tx.onerror = rej; }; }); const im = s.mk('image', { x: 500, y: 400, content: { blobId: id, w: 40, h: 30, name: 'square.png' } }); s.addEl(im); s.render(); });
await p.click('#io'); await p.waitForTimeout(300);
const xs = await ev(() => [...document.querySelectorAll('.xpop h3')].map(h => h.textContent).join('|') + ' :: ' + [...document.querySelectorAll('.xpop .xs > button span')].map(x => x.textContent).join('|'));
ok('export popup has Milanote sections', xs.startsWith('Current board layout|Linear document|Download all files|Backup') && xs.includes('PDF (high quality)') && xs.includes('Word document') && xs.includes('Plain text') && /Generate ZIP \(\d/.test(xs), xs);
const dl = async (sel, sub) => { await p.click('#io'); await p.waitForTimeout(150); if (sub) await p.click('.xpop .ptg'); const [d] = await Promise.all([p.waitForEvent('download', { timeout: 15000 }), p.click(sel)]); const path = '/tmp/claude-0/' + d.suggestedFilename(); await d.saveAs(path); return path; };
const txtPath = await dl('.xpop [data-x=txt]', true);
const fs = await import('fs'); const txt = fs.readFileSync(txtPath, 'utf8');
ok('plain text export (with sub-boards)', txt.includes('BIG TITLE') === false ? (txt.includes('Big title') && txt.includes('☑ buy milk') && txt.includes('inside sub') && txt.includes('link (https://example.com)')) : true, txt.slice(0, 300).replace(/\n/g, '⏎'));
const docxPath = await dl('.xpop [data-x=docx]');
const { execSync } = await import('child_process');
const dx = execSync(`python3 -c "import zipfile,sys,xml.dom.minidom as m;z=zipfile.ZipFile(sys.argv[1]);[m.parseString(z.read(n)) for n in z.namelist() if n.endswith('.xml') or n.endswith('.rels')];d=z.read('word/document.xml').decode();print(len(z.namelist()),'Big title' in d,'buy milk' in d,'w:tbl' in d,'w:hyperlink' in d,any(n.startswith('word/media/') for n in z.namelist()))" ${docxPath}`).toString().trim();
ok('Word .docx is valid XML with text, table, link, image', dx.endsWith('True True True True True'), dx);
const zipPath = await dl('.xpop [data-x=zip]');
const zl = execSync(`python3 -c "import zipfile,sys;print(zipfile.ZipFile(sys.argv[1]).namelist())" ${zipPath}`).toString().trim();
ok('ZIP of all files contains the image', zl.includes('square.png'), zl);
const pdfPath = await dl('.xpop [data-x=pdfhq]');
ok('PDF high quality renders', fs.readFileSync(pdfPath).slice(0, 4).toString() === '%PDF');

// ===== 7. file viewer
await fresh();
const putBlob = (id, content, type) => ev(async ([id, content, type]) => { const blob = new Blob([content], { type }); await new Promise((res, rej) => { const rq = indexedDB.open('space-db'); rq.onsuccess = () => { const tx = rq.result.transaction('blobs', 'readwrite'); tx.objectStore('blobs').put(blob, id); tx.oncomplete = res; tx.onerror = rej; }; }); }, [id, content, type]);
await putBlob('fv-txt', 'hello from a text file', 'text/plain'); await putBlob('fv-bin', 'xxxx', 'application/octet-stream');
const ft = await mkAt('file', 100, 100, { content: { blobId: 'fv-txt', name: 'notes.txt', kind: 'other', size: 22 } });
const fb = await mkAt('file', 500, 100, { content: { blobId: 'fv-bin', name: 'scene.blend', kind: 'other', size: 4 } });
let fc = await center(ft); await p.mouse.dblclick(fc.x, fc.y); await p.waitForTimeout(250);
ok('double-click file opens viewer with name + download', await ev(() => { const m = document.querySelector('#fview'); return !!m && m.querySelector('.fvt b').textContent === 'notes.txt' && !!m.querySelector('.fvd') && m.querySelector('.fvtxt')?.textContent.includes('hello from a text'); }));
const [fdl] = await Promise.all([p.waitForEvent('download'), p.click('#fview .fvd')]);
ok('viewer Download saves the original file', fdl.suggestedFilename() === 'notes.txt', fdl.suggestedFilename());
await p.keyboard.press('Escape'); await p.waitForTimeout(80);
ok('Esc closes viewer', await ev(() => !document.querySelector('#fview')));
fc = await center(fb); await p.mouse.dblclick(fc.x, fc.y); await p.waitForTimeout(250);
ok('unknown type shows "No preview" + download', await ev(() => document.querySelector('#fview .fvnone p')?.textContent.includes('No preview')));
await p.mouse.click(10, 450); await p.waitForTimeout(80);
ok('click backdrop closes viewer', await ev(() => !document.querySelector('#fview')));
await p.click(`#world .el[data-id="${ft}"]`, { button: 'right' }); await p.waitForTimeout(80);
await p.click('#cmenu [data-a=openfile]'); await p.waitForTimeout(200);
ok('context menu Open File uses viewer', await ev(() => !!document.querySelector('#fview .fvtxt')));
await p.keyboard.press('Escape');

// ===== 8. quick notes
await fresh();
const qcard = await mkAt('note', 300, 300, { content: { html: '<p>to stash</p>' } });
await p.click('#qn-btn'); await p.waitForTimeout(100);
ok('Quick notes popup opens from header (empty state)', await ev(() => { const q = document.querySelector('#qn'); return !!q && q.classList.contains('empty') && q.querySelector('h2').textContent === 'Quick notes'; }));
await p.click('#qn .qnadd'); await p.keyboard.type('remember this'); await p.keyboard.press('Escape'); await p.waitForTimeout(100);
ok('+ Note creates a quick note', await ev(() => { const S = window.__space.S; const k = Object.values(S.els).filter(e => e.parentId === 'quicknotes' && !e.trashed); return k.length === 1 && k[0].content.html.includes('remember this') && document.querySelector('#qn-count').textContent === '1'; }));
// drag canvas card into quick notes
let qc = await center(qcard); const qbox = await ev(() => { const r = document.querySelector('#qn-list').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.bottom - 10 }; });
await p.mouse.move(qc.x, qc.y); await p.mouse.down(); await p.mouse.move(qbox.x, qbox.y, { steps: 10 }); await p.mouse.up(); await p.waitForTimeout(150);
ok('drag card from board into quick notes', await ev(id => { const e = window.__space.S.els[id]; return e.parentId === 'quicknotes' && e.section === 'list' && !!document.querySelector(`#qn-list .el[data-id="${id}"]`); }, qcard));
ok('popup stays open after drop', await ev(() => !!document.querySelector('#qn')));
// drag out to canvas
const qn1 = await ev(id => { const r = document.querySelector(`#qn-list .el[data-id="${id}"]`).getBoundingClientRect(); return { x: r.left + 40, y: r.top + 15 }; }, qcard);
await p.mouse.move(qn1.x, qn1.y); await p.mouse.down(); await p.mouse.move(300, 600, { steps: 10 }); await p.mouse.up(); await p.waitForTimeout(150);
ok('drag quick note out onto the board', await ev(id => { const S = window.__space.S; const e = S.els[id]; return e.section === 'canvas' && e.parentId === S.cur; }, qcard));
// persists across boards
await ev(() => { const s = window.__space; const b = s.mk('board', { content: { title: 'Other' } }); s.S.els[b.id] = b; s.openBoard(b.id); });
await p.waitForTimeout(80);
ok('quick notes available on any board', await ev(() => document.querySelectorAll('#qn-list .el').length === 1 || document.querySelector('#qn-count').textContent === '1'));
await p.mouse.click(700, 500); await p.waitForTimeout(80);
ok('click outside closes quick notes', await ev(() => !document.querySelector('#qn')));
ok('quick notes not listed as a board in search', await ev(() => { document.querySelector('#search').click(); const t = [...document.querySelectorAll('.spanel .sb-t')].map(x => x.textContent); document.querySelector('.spanel')?.remove(); return !t.includes('Quick notes'); }));

// ===== 9. document modal
await fresh();
const dcard = await mkAt('doc', 200, 200, { content: { title: 'Brief', html: '<p>First paragraph</p>' } });
let dc = await ev(id => { const r = document.querySelector(`#world .el[data-id="${id}"]`).getBoundingClientRect(); return { x: r.left + 30, y: r.bottom - 12 }; }, dcard); await p.mouse.dblclick(dc.x, dc.y); await p.waitForTimeout(200);
ok('double-click document opens big modal with title + Export', await ev(() => { const m = document.querySelector('#docm'); return !!m && m.querySelector('.dmt').value === 'Brief' && !!m.querySelector('.dmexp') && m.querySelector('.dmw').getBoundingClientRect().height > 600; }));
ok('text toolbar sits beside the document', await ev(() => { const t = document.querySelector('#tools').getBoundingClientRect(), w = document.querySelector('#docm .dmw').getBoundingClientRect(); const names = [...document.querySelectorAll('#tools .tool span')].map(s => s.textContent); return t.right <= w.left + 1 && names.includes('Bold') && names.includes('Style') && getComputedStyle(document.querySelector('#tools')).zIndex > 600; }));
await ev(() => { const b = document.querySelector('#dbody'); const r = document.createRange(); r.selectNodeContents(b.querySelector('p')); const s = getSelection(); s.removeAllRanges(); s.addRange(r); b.focus(); });
await p.click('#tools [data-tool=bold]'); await p.waitForTimeout(50);
ok('Bold tool works inside document', await ev(() => !!document.querySelector('#dbody b, #dbody strong')));
await ev(() => { const b = document.querySelector('#dbody'); b.focus(); const r = document.createRange(); r.selectNodeContents(b); r.collapse(false); const s = getSelection(); s.removeAllRanges(); s.addRange(r); });
await p.keyboard.press('Enter'); await p.keyboard.type('Second line'); await p.waitForTimeout(500);
await p.click('#docm .dmexp'); await p.waitForTimeout(100);
ok('document Export offers PDF, Word, Markdown, Plain text', await ev(() => [...document.querySelectorAll('.dxpop button span')].map(x => x.textContent).join() === 'PDF,Word document,Markdown,Plain text'));
const [ddl] = await Promise.all([p.waitForEvent('download'), p.click('.dxpop [data-x=md]')]); const mdp = '/tmp/claude-0/' + ddl.suggestedFilename(); await ddl.saveAs(mdp);
const md = (await import('fs')).readFileSync(mdp, 'utf8');
ok('document Markdown export has title and text', md.startsWith('# Brief') && md.includes('**First paragraph**') && md.includes('Second line'), md.replace(/\n/g, '⏎'));
const [wdl] = await Promise.all([p.waitForEvent('download', { timeout: 15000 }), (async () => { await p.click('#docm .dmexp'); await p.click('.dxpop [data-x=docx]'); })()]); 
ok('document Word export downloads .docx', wdl.suggestedFilename() === 'Brief.docx');
await p.keyboard.press('Escape'); await p.waitForTimeout(150);
ok('Esc closes document and saves', await ev(id => { const e = window.__space.S.els[id]; return !document.querySelector('#docm') && e.content.html.includes('Second line') && !document.body.classList.contains('docmode') && !window.__space.S.editing; }, dcard));
ok('toolbar back in place after closing', await ev(() => !document.querySelector('#tools').style.left));

// ===== 10. customizable toolbar + More
await fresh();
let tn10 = await toolNames();
ok('create toolbar fits without More when there is room; no Trash in sidebar', !tn10.includes('More') && !tn10.includes('Trash') && tn10.includes('Heading'), tn10.join('|'));
await p.click('#tools', { button: 'right', position: { x: 30, y: 200 } }); await p.waitForTimeout(80);
ok('right-click on toolbar offers Customize toolbar', await ev(() => !!document.querySelector('.tbctx button')));
await p.click('.tbctx button'); await p.waitForTimeout(80);
ok('toolbar settings shows all tools as toggles', await ev(() => document.querySelectorAll('#modal .tbopt').length === 15 && document.querySelectorAll('#modal .tbopt.on').length === 15));
await p.click('#modal .tbopt[data-k=map]'); await p.click('#modal .tbopt[data-k=video]'); await p.click('#tbdone'); await p.waitForTimeout(80);
tn10 = await toolNames();
ok('hidden tools leave the toolbar', !tn10.includes('Map') && !tn10.includes('Video'), tn10.join('|'));
await p.click('#tools [data-tool=cmore]'); await p.waitForTimeout(80);
ok('hidden tools appear inside More', await ev(() => [...document.querySelectorAll('.mpop .mtool span')].map(x => x.textContent).join() === 'Map,Video'));
await p.click('.mpop .mtool[data-mtool=map]'); await p.waitForTimeout(100);
ok('clicking a tool in More creates it', await ev(() => window.__space.canvasKids(window.__space.S.cur).some(e => e.type === 'link' && e.content.kind === 'map')));
await p.keyboard.press('Escape'); await ev(() => { document.activeElement?.blur?.(); window.__space.S.sel.clear(); window.__space.S.editing = null; window.__space.render(); });
// drag from More onto canvas
await p.click('#tools [data-tool=cmore]'); await p.waitForTimeout(80);
const mv = await ev(() => { const r = document.querySelector('.mpop .mtool[data-mtool=video]').getBoundingClientRect(); return { x: r.left + 20, y: r.top + 15 }; });
await p.mouse.move(mv.x, mv.y); await p.mouse.down(); await p.mouse.move(700, 500, { steps: 10 }); await p.mouse.up(); await p.waitForTimeout(150);
ok('drag a tool out of More onto the board', await ev(() => window.__space.canvasKids(window.__space.S.cur).some(e => e.type === 'link' && e.content.kind === 'video')));
ok('tool prefs persist in meta', await ev(() => window.__space.S.meta.tools.map === false));
// small window collapses overflow into More
await ev(() => { window.__space.S.meta.tools = {}; window.__space.S.sel.clear(); window.__space.S.editing = null; window.__space.render(); });
await p.setViewportSize({ width: 1200, height: 560 }); await p.waitForTimeout(150);
tn10 = await toolNames();
ok('short window auto-collapses tools into More', tn10.includes('More') && !tn10.includes('Heading') && await ev(() => { const t = document.querySelector('#tools'); return t.scrollHeight <= t.clientHeight + 1; }), tn10.join('|'));
await p.setViewportSize({ width: 1400, height: 900 }); await p.waitForTimeout(100);

// ===== PDF preview
await fresh();
const pdfB64 = (await import('fs')).readFileSync('/tmp/claude-0/test.pdf').toString('base64');
await ev(async b64 => { const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0)); const blob = new Blob([bin], { type: 'application/pdf' }); await new Promise((res, rej) => { const rq = indexedDB.open('space-db'); rq.onsuccess = () => { const tx = rq.result.transaction('blobs', 'readwrite'); tx.objectStore('blobs').put(blob, 'pdf-test'); tx.oncomplete = res; tx.onerror = rej; }; }); }, pdfB64);
const pf = await mkAt('file', 120, 80, { content: { blobId: 'pdf-test', name: 'Lumina treatment.pdf', kind: 'other', size: 4000 } });
await p.waitForFunction(id => !!window.__space.S.els[id].content.thumb, pf, { timeout: 15000 }).catch(() => {});
await p.waitForTimeout(400);
ok('PDF card shows first-page preview', await ev(id => { const e = window.__space.S.els[id]; const im = document.querySelector(`#world .el[data-id="${id}"] .fpv img`); return !!e.content.thumb && e.content.pages === 3 && !!im && im.naturalWidth > 100; }, pf), await ev(id => JSON.stringify(window.__space.S.els[id].content), pf));
const pfc = await ev(id => { const r = document.querySelector(`#world .el[data-id="${id}"] .fpv`).getBoundingClientRect(); return { x: r.left + 60, y: r.top + 60 }; }, pf);
await p.mouse.dblclick(pfc.x, pfc.y); await p.waitForTimeout(1500);
ok('PDF opens in viewer with all pages rendered', await ev(() => document.querySelectorAll('#fview .fvpage').length === 3 && /3 pages/.test(document.querySelector('#fview .fvt small').textContent)));
await p.screenshot({ path: '/tmp/claude-0/pdfview.png' }); await p.keyboard.press('Escape'); await p.waitForTimeout(200); await p.screenshot({ path: '/tmp/claude-0/pdfcard.png', clip: { x: 0, y: 0, width: 900, height: 900 } });
await p.keyboard.press('Escape');

// ===== distribute + trash in header
await fresh();
const d1 = await mkAt('note', 100, 100, { content: { html: '<p>A</p>' } }), d2 = await mkAt('note', 120, 260, { content: { html: '<p>B</p>' } }), d3 = await mkAt('note', 90, 420, { content: { html: '<p>C</p>' } });
await sel([d1, d2, d3]);
const tsel = await toolNames();
ok('multi-select shows Distribute, no Alignment', tsel.includes('Distribute') && !tsel.includes('Alignment'), tsel.join('|'));
await p.click('#tools [data-tool=distribute]'); await p.click('.pop [data-a=hdist]'); await p.waitForTimeout(100);
let dd = await ev(ids => ids.map(id => { const e = window.__space.S.els[id]; const n = document.querySelector(`#world .el[data-id="${id}"]`); return { x: e.x, y: e.y, w: n.offsetWidth }; }), [d1, d2, d3]);
const sx = dd.slice().sort((a, b) => a.x - b.x); const g1 = sx[1].x - (sx[0].x + sx[0].w), g2 = sx[2].x - (sx[1].x + sx[1].w);
ok('Horizontally: stacked cards become a row with equal gaps', dd.every(o => o.y === dd[0].y) && g1 === g2 && g1 > 0, JSON.stringify(dd));
await sel([d1, d2, d3]); await p.click('#tools [data-tool=distribute]'); await p.click('.pop [data-a=vdist]'); await p.waitForTimeout(100);
dd = await ev(ids => ids.map(id => { const e = window.__space.S.els[id]; const n = document.querySelector(`#world .el[data-id="${id}"]`); return { x: e.x, y: e.y, h: n.offsetHeight }; }), [d1, d2, d3]);
const sy = dd.slice().sort((a, b) => a.y - b.y); const v1 = sy[1].y - (sy[0].y + sy[0].h), v2 = sy[2].y - (sy[1].y + sy[1].h);
ok('Vertically: cards become a column with equal gaps', dd.every(o => o.x === dd[0].x) && v1 === v2 && v1 > 0, JSON.stringify(dd));
ok('presentation button hidden from header', await ev(() => getComputedStyle(document.querySelector('#present')).display === 'none'));
await sel([]); const dc1 = await center(d1); const tb = await ev(() => { const r = document.querySelector('#trashbtn').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
await p.mouse.move(dc1.x, dc1.y); await p.mouse.down(); await p.mouse.move(tb.x, tb.y, { steps: 10 }); await p.mouse.up(); await p.waitForTimeout(100);
ok('dragging a card onto the header trash deletes it', await ev(id => window.__space.S.els[id].trashed === true, d1));

// ===== template picker + color picker + header
await fresh(); await p.waitForTimeout(100);
ok('header has no Fit, Unsorted or Templates buttons', await ev(() => ['#fit', '#inbox-btn', '#templates'].every(s => getComputedStyle(document.querySelector(s)).display === 'none')));
ok('empty board shows template picker bottom-right', await ev(() => { const t = document.querySelector('#tplp'); if (!t) return false; const r = t.getBoundingClientRect(); return r.right > innerWidth - 40 && r.bottom > innerHeight - 120 && t.querySelector('h3').textContent === 'Choose a template'; }));
await p.click('#tplp .tpi[data-t=moodboard]'); await p.waitForTimeout(150);
ok('selecting a template previews it on the board', await ev(() => window.__space.canvasKids(window.__space.S.cur).length > 3 && document.body.classList.contains('tpl-preview') && document.querySelector('#tplp .tpuse').textContent === 'Use this template'));
await p.click('#tplp .tpi[data-t=week]'); await p.waitForTimeout(150);
ok('switching template replaces the preview', await ev(() => window.__space.canvasKids(window.__space.S.cur).filter(e => e.type === 'column').length === 7));
await p.click('#tplp .tpuse'); await p.waitForTimeout(150);
ok('Use this template keeps it and closes picker', await ev(() => !document.querySelector('#tplp') && !document.body.classList.contains('tpl-preview') && window.__space.canvasKids(window.__space.S.cur).filter(e => e.type === 'column').length === 7));
await p.keyboard.press('Control+z'); await p.waitForTimeout(100);
ok('undo removes the applied template', await ev(() => window.__space.canvasKids(window.__space.S.cur).length === 0));
await fresh(); await p.waitForTimeout(100); await p.click('#tplp .tpx'); await p.waitForTimeout(80);
ok('closing picker dismisses it for that board', await ev(() => !document.querySelector('#tplp')));
await p.click('#stage', { button: 'right', position: { x: 700, y: 400 } }); await p.waitForTimeout(80);
await p.hover('#cmenu .sub > button'); await p.waitForTimeout(80);
const ccm = await ev(() => { const r = document.querySelector('#cmenu [data-a=bgcustom]').getBoundingClientRect(); return { x: r.left + 10, y: r.top + 5, right: r.right, top: r.top }; });
await p.mouse.click(ccm.x, ccm.y); await p.waitForTimeout(100);
ok('Choose Custom Color opens picker next to the menu item', await ev(c => { const k = document.querySelector('.cpick'); if (!k) return false; const r = k.getBoundingClientRect(); return Math.abs(r.top - (c.top - 8)) < 40 && r.left >= c.right - 4; }, ccm));
const svb = await ev(() => { const r = document.querySelector('.cpick .cpsv').getBoundingClientRect(); return { x: r.left + r.width * 0.8, y: r.top + r.height * 0.3 }; });
await p.mouse.click(svb.x, svb.y); await p.waitForTimeout(60);
ok('picking a color changes board background live', await ev(() => /^#/.test(window.__space.S.els[window.__space.S.cur].content.bg || '') && document.querySelector('#stage').style.backgroundColor !== ''));
await p.keyboard.press('Escape');
// fixed Templates button
ok('fixed Templates button sits above the zoom HUD', await ev(() => { const b = document.querySelector('#tplbtn').getBoundingClientRect(), z = document.querySelector('#zoomhud').getBoundingClientRect(); return b.width > 0 && b.bottom <= z.top && Math.abs(b.right - z.right) < 4; }));
await p.click('#tplbtn'); await p.waitForTimeout(100);
ok('button reopens picker on a dismissed board and hides itself', await ev(() => !!document.querySelector('#tplp') && getComputedStyle(document.querySelector('#tplbtn')).display === 'none'));
await p.click('#tplp .tpx'); await p.waitForTimeout(80);
await ev(() => { const s = window.__space; s.commit(); const e = s.mk('note', { content: { html: 'keep me' } }); e.x = 40; e.y = 40; s.addEl(e); s.render(); });
await p.click('#tplbtn'); await p.waitForTimeout(100);
ok('on a board with content: no Empty board option, button disabled', await ev(() => !document.querySelector('#tplp .tpi[data-t=blank]') && document.querySelector('#tplp .tpuse').disabled));
await p.click('#tplp .tpi[data-t=week]'); await p.waitForTimeout(150);
await p.click('#tplp .tpuse'); await p.waitForTimeout(150);
ok('template is added below existing content', await ev(() => { const s = window.__space, k = s.canvasKids(s.S.cur); const n = k.find(e => e.type === 'note' && /keep me/.test(e.content.html)); const cols = k.filter(e => e.type === 'column'); return n && cols.length === 7 && cols.every(c => c.y > n.y + 40) && !document.querySelector('#tplp'); }));

ok('no page errors', errs.length === 0, errs.join(' | '));
await p.screenshot({ path: process.env.SHOT || '/tmp/round2.png' });
const fails = res.filter(r => r[0] === 'FAIL');
res.forEach(r => console.log(r[0], r[1], r[2] ? '— ' + r[2] : ''));
console.log(`\n${res.length - fails.length}/${res.length} passed`);
await b.close();

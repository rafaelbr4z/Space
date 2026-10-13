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

// ---- 1. canvas context menu
await fresh();
await p.click('#stage', { button: 'right', position: { x: 800, y: 500 } }); await p.waitForTimeout(100);
let items = await menuItems();
ok('canvas menu: no Paste/Undo when empty clipboard', !items.includes('Paste'), items.join('|'));
ok('canvas menu order New…', items.slice(0, 8).join('|').includes('New Note|New Link|New To-do|New Line|New Board|New Column|New Comment'), items.join('|'));
ok('canvas menu bg submenu', items.includes('Change Board Background') && items.includes('Show Dot Grid') && items.includes('Choose Custom Color'));
await p.hover('#cmenu .sub > button'); await p.click('#cmenu [data-a=bggrid]');
ok('Show Dot Grid toggles grid off', await ev(() => document.querySelector('#stage').classList.contains('nogrid')));
await p.click('#stage', { button: 'right', position: { x: 800, y: 500 } }); items = await menuItems();
ok('Undo appears after change', items.includes('Undo'));
await p.keyboard.press('Escape'); await p.mouse.click(700, 450);

// ---- 2. element context menu
await fresh();
const n1 = await mkAt('note', 100, 100, { content: { html: '<p>A</p>' } }); const n2 = await mkAt('note', 500, 100, { content: { html: '<p>B</p>' } });
let c = await center(n1); await p.mouse.click(c.x, c.y, { button: 'right' }); items = await menuItems();
ok('note menu has Cut/Copy/Duplicate/Move to Trash', ['Cut', 'Copy', 'Duplicate', 'Move to Trash'].every(x => items.includes(x)), items.join('|'));
ok('note menu has Convert to Document + Lock + Front/Back + Created', items.includes('Convert to Document') && items.includes('Lock Position') && items.includes('Bring to Front') && items.some(x => x.startsWith('Created')));
await p.keyboard.press('Escape'); await p.mouse.click(1200, 800);
await sel([n1, n2]); c = await center(n1); await p.mouse.click(c.x, c.y, { button: 'right' }); items = await menuItems();
ok('multi menu has Group into Column + Connect with Lines', items.includes('Group into Column') && items.includes('Connect with Lines'), items.join('|'));
await p.click('#cmenu [data-a=connect]'); await p.waitForTimeout(100);
ok('Connect with Lines created a connected line', await ev(([a, b]) => Object.values(window.__space.S.els).some(e => e.type === 'line' && !e.trashed && ((e.content.a.el === a && e.content.b.el === b) || (e.content.a.el === b && e.content.b.el === a))), [n1, n2]));
await sel([n1, n2]); c = await center(n1); await p.mouse.click(c.x, c.y, { button: 'right' }); await p.click('#cmenu [data-a=group]'); await p.waitForTimeout(150);
ok('Group into Column', await ev(([a, b]) => { const S = window.__space.S; const A = S.els[a], B = S.els[b]; return A.section === 'list' && B.section === 'list' && A.parentId === B.parentId && S.els[A.parentId].type === 'column'; }, [n1, n2]));
const colId = await ev(a => window.__space.S.els[a].parentId, n1);
await sel([colId]); c = await center(colId); await p.mouse.click(c.x, c.y - 0, { button: 'right' }); items = await menuItems();
ok('column menu: Rename + Convert to Board', items.includes('Rename') && items.includes('Convert to Board'), items.join('|'));
await p.click('#cmenu [data-a=toboard]'); await p.waitForTimeout(150);
ok('Convert column to board', await ev(a => { const S = window.__space.S; const A = S.els[a]; return S.els[A.parentId].type === 'board' && A.section === 'canvas'; }, n1));
// convert note->doc->note
await fresh(); const n3 = await mkAt('note', 100, 100, { content: { html: '<h1>Title</h1><p>body</p>' } });
await sel([n3]); c = await center(n3); await p.mouse.click(c.x, c.y, { button: 'right' }); await p.click('#cmenu [data-a=todoc]'); await p.waitForTimeout(100);
ok('Convert to Document keeps title', await ev(id => { const e = window.__space.S.els[id]; return e.type === 'doc' && e.content.title === 'Title' && e.content.html.includes('body'); }, n3));
// cut
await sel([n3]); await p.keyboard.press('Control+x'); await p.waitForTimeout(100);
ok('⌘X cuts (trashes + clipboard)', await ev(id => window.__space.S.els[id].trashed && window.__space.S.clip?.length === 1, n3));

// ---- 3. collision push
await fresh();
const top = await mkAt('note', 100, 100, { content: { html: '<p>Top</p>' } }); const below = await mkAt('note', 100, 180, { content: { html: '<p>Below</p>' } });
await p.waitForTimeout(300);
const y0 = await ev(id => window.__space.S.els[id].y, below);
const gapBefore = await ev(([a, b]) => { const S = window.__space.S; const na = document.querySelector(`#world .el[data-id="${a}"]`); return S.els[b].y - (S.els[a].y + na.offsetHeight); }, [top, below]);
await ev(id => { const n = document.querySelector(`#world .el[data-id="${id}"] .body`); n.innerHTML += '<p>line</p><p>line</p><p>line</p><p>line</p>'; }, top); await p.waitForTimeout(250);
const y1 = await ev(id => window.__space.S.els[id].y, below);
const gapAfter = await ev(([a, b]) => { const S = window.__space.S; const na = document.querySelector(`#world .el[data-id="${a}"]`); return S.els[b].y - (S.els[a].y + na.offsetHeight); }, [top, below]);
ok('growing note pushes the one below', y1 > y0, `y ${y0}→${y1}, gap ${gapBefore}→${gapAfter}`);
await ev(id => { const n = document.querySelector(`#world .el[data-id="${id}"] .body`); n.innerHTML = '<p>Top</p>'; }, top); await p.waitForTimeout(250);
const y2 = await ev(id => window.__space.S.els[id].y, below);
ok('shrinking pulls it back up (not above original)', y2 < y1 && y2 >= y0, `y ${y1}→${y2} (orig ${y0})`);

// ---- 4. quick line
await fresh(); const q1 = await mkAt('note', 100, 100, { content: { html: '<p>Q1</p>' } }); const q2 = await mkAt('note', 600, 300, { content: { html: '<p>Q2</p>' } });
await sel([q1]); await p.waitForTimeout(100);
const qlBox = await ev(() => { const q = document.querySelector('#world .ql'); if (!q) return null; const r = q.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
ok('quick line handle shows on single selection', !!qlBox);
if (qlBox) { const t2 = await center(q2); await p.mouse.move(qlBox.x, qlBox.y); await p.mouse.down(); await p.mouse.move(t2.x - 50, t2.y, { steps: 8 }); await p.mouse.move(t2.x, t2.y, { steps: 4 }); await p.mouse.up(); await p.waitForTimeout(100); }
ok('quick line connects both cards', await ev(([a, b]) => Object.values(window.__space.S.els).some(e => e.type === 'line' && !e.trashed && e.content.a.el === a && e.content.b.el === b), [q1, q2]));
// curve control point
const lineId = await ev(() => Object.values(window.__space.S.els).find(e => e.type === 'line' && !e.trashed && e.parentId===window.__space.S.cur)?.id);
await sel([lineId]); await p.waitForTimeout(80); console.log('cpdbg', await ev(()=>{ const c=document.querySelector('#lines .cp'); if(!c) return 'none'; const r=c.getBoundingClientRect(); return document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)?.className?.baseVal ?? document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)?.className; }));
const cp = await ev(() => { const c = document.querySelector('#lines .cp'); if (!c) return null; const r = c.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
if (cp) { await p.mouse.move(cp.x, cp.y); await p.mouse.down(); await p.mouse.move(cp.x + 10, cp.y + 80, { steps: 6 }); await p.mouse.up(); }
ok('line midpoint drag curves the line', await ev(id => !!window.__space.S.els[id].content.ctrl && document.querySelector('#lines path.vis').getAttribute('d').includes('Q'), lineId));
// dblclick resize handle on image
await fresh(); const im = await mkAt('image', 100, 100, { content: { blobId: null, url: 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==', w: 800, h: 400, caption: '' } });
await sel([im]); const rz = await ev(id => { const r = document.querySelector(`#world .el[data-id="${id}"] .rz`).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, im);
await p.mouse.dblclick(rz.x - 3, rz.y); await p.waitForTimeout(100);
ok('dblclick resize handle → natural media width', await ev(id => window.__space.S.els[id].w === 800, im), await ev(id => String(window.__space.S.els[id].w), im));

// ---- 5. shortcuts
await fresh(); const a1 = await mkAt('note', 100, 100), a2 = await mkAt('note', 500, 160), a3 = await mkAt('note', 900, 220);
await sel([a1, a2, a3]); await p.keyboard.press('Alt+KeyW'); await p.waitForTimeout(80);
ok('⌥W aligns top', await ev(ids => ids.every(id => window.__space.S.els[id].y === 100), [a1, a2, a3]));
await p.keyboard.press('Alt+KeyA'); ok('⌥A aligns left', await ev(ids => ids.every(id => window.__space.S.els[id].x === 100), [a1, a2, a3]));
await sel([a1]); await p.keyboard.press('Alt+Backquote'); await p.waitForTimeout(80);
ok('⌥` moves to Unsorted', await ev(id => window.__space.S.els[id].section === 'inbox', a1));
await sel([a2]); await p.keyboard.press('Control+Enter'); await p.waitForTimeout(120);
ok('⌘↩ creates new card of same type below', await ev(id => { const S = window.__space.S; const e = S.els[[...S.sel][0]]; return e && e.id !== id && e.type === 'note' && e.y > S.els[id].y; }, a2));
await p.keyboard.press('Escape'); await p.keyboard.press('Escape');
const ui0 = await ev(() => window.__space.S.ui); await p.keyboard.press('Control+Shift+Comma'); const ui1 = await ev(() => window.__space.S.ui);
ok('⌘⇧, makes interface smaller', ui1 < ui0, `${ui0}→${ui1}`); await p.keyboard.press('Control+Shift+Period');
ok('sidebar has no Table/Sketch/Draw', await ev(() => !document.querySelector('#tools [data-tool=table],#tools [data-tool=sketch],#tools [data-tool=draw]')));
await p.keyboard.press('Slash'); ok('/ opens shortcuts', await ev(() => document.querySelector('#modal').classList.contains('open') && document.querySelector('#modal-box').textContent.includes('Paste styles'))); await p.keyboard.press('Escape');
// paste styles
await fresh(); const s1 = await mkAt('note', 100, 100), s2 = await mkAt('note', 500, 100);
await ev(id => { window.__space.S.els[id].bg = '#ffd14d'; window.__space.render(); }, s1);
await sel([s1]); await p.keyboard.press('Control+c'); await sel([s2]); await p.keyboard.press('Control+Alt+KeyV'); await p.waitForTimeout(100);
ok('⌘⌥V pastes styles', await ev(id => window.__space.S.els[id].bg === '#ffd14d', s2));
ok('⌘⌥V did not also paste a copy', await ev(() => Object.values(window.__space.S.els).filter(e => e.type === 'note' && !e.trashed && e.parentId === window.__space.S.cur).length === 2));

// ---- 6. paste
await fresh();
const dispatchPaste = (data) => ev(data => { const dt = new DataTransfer(); Object.entries(data).forEach(([k, v]) => dt.setData(k, v)); document.body.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true })); }, data);
await dispatchPaste({ 'text/plain': 'a\tb\n1\t2\n3\t4' }); await p.waitForTimeout(100);
ok('TSV paste → Table in Unsorted', await ev(() => { const S = window.__space.S; const k = window.__space.inboxKids(S.cur); return k[0]?.type === 'table' && k[0].content.rows.length === 3; }));
await sel([]); await dispatchPaste({ 'text/plain': '[ ] buy\n[x] done' }); await p.waitForTimeout(100);
ok('checklist paste → To-do at top of Unsorted', await ev(() => { const S = window.__space.S; const k = window.__space.inboxKids(S.cur); return k[0]?.type === 'tasks'; }));
await dispatchPaste({ 'text/plain': 'https://example.com/page' }); await p.waitForTimeout(100);
ok('link paste → Link at top of Unsorted', await ev(() => window.__space.inboxKids(window.__space.S.cur)[0]?.type === 'link'));
const imgc = await mkAt('image', 100, 100, { content: { blobId: null, url: 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==', w: 10, h: 10, caption: '', showCaption: false } });
await sel([imgc]); await dispatchPaste({ 'text/plain': 'My caption' }); await p.waitForTimeout(100);
ok('text pasted on selected image becomes caption', await ev(id => { const e = window.__space.S.els[id]; return e.content.showCaption && e.content.caption === 'My caption'; }, imgc));

// ---- 7. colors
await fresh(); const cn = await mkAt('note', 100, 100); await sel([cn]);
await p.click('#tools [data-tool=color]'); await p.waitForTimeout(80);
ok('color popup has Background/Top strip switch', await ev(() => !!document.querySelector('.pop .cmodes')));
ok('color popup has 11 Milanote colors + none', await ev(() => document.querySelectorAll('.pop .cgrid .sw[data-c]').length >= 12));
await p.click('.pop .cgrid .sw[title=yellow]'); await p.waitForTimeout(80);
ok('Background mode sets card background', await ev(id => window.__space.S.els[id].bg === '#ffd14d' && document.querySelector(`#world .el[data-id="${id}"]`).classList.contains('has-bg'), cn));
const cc = await mkAt('column', 600, 100); await sel([cc]); await p.click('#tools [data-tool=color]'); await p.click('.pop .cgrid .sw[title=blue]'); await p.waitForTimeout(80);
ok('column uses Milanote light tint', await ev(id => getComputedStyle(document.querySelector(`#world .el[data-id="${id}"]`)).backgroundColor === 'rgb(108, 199, 255)', cc));

// ---- 8. markdown / checklist / divider
await fresh(); await p.mouse.dblclick(700, 400); await p.waitForTimeout(100);
await p.keyboard.type('[] '); await p.keyboard.type('task');
ok('[] + space → checklist', await ev(() => !!document.querySelector('.el.note.editing .body ul.cl li')));
await p.keyboard.press('Escape'); await p.mouse.dblclick(700, 650); await p.waitForTimeout(100); await p.keyboard.type('---');
ok('--- → divider', await ev(() => !!document.querySelector('.el.note.editing .body hr')));
await p.keyboard.press('Escape');

// ---- 9. link-like inline cards
await fresh(); await p.click('#tools [data-tool=audio]'); await p.waitForTimeout(120);
ok('Audio tool opens inline link card with Spotify placeholder', await ev(() => document.activeElement?.placeholder === 'Paste a link from Spotify or Soundcloud'));
await p.keyboard.type('https://open.spotify.com/track/abc123'); await p.keyboard.press('Enter'); await p.waitForTimeout(100);
ok('audio link stored', await ev(() => Object.values(window.__space.S.els).some(e => e.type === 'link' && e.content.url?.includes('spotify'))));
await p.keyboard.press('Escape'); await p.mouse.click(1200,820); await p.click('#tools [data-tool=map]'); await p.waitForTimeout(120); await p.keyboard.type('https://www.google.com/maps/place/Bras%C3%ADlia/@-15.79,-47.88,11z'); await p.keyboard.press('Enter'); await p.waitForTimeout(100);
ok('map link parsed into place', await ev(() => Object.values(window.__space.S.els).some(e => e.type === 'map' && /Bras/.test(e.content.query))));

// ---- selection toolbar per type
await fresh(); const ln = await mkAt('line', 0, 0, { content: { a: { x: 100, y: 100, el: null }, b: { x: 400, y: 100, el: null }, startStyle: 'none', endStyle: 'arrow', style: 'solid', weight: 2, label: '' } });
await sel([ln]); const tl = await ev(() => [...document.querySelectorAll('#tools .tool span')].map(s => s.textContent));
ok('line toolbar = Color, Start, End, Label, Style, Weight', ['Color', 'Start', 'End', 'Label', 'Style', 'Weight'].every(x => tl.includes(x)), tl.join('|'));
await p.click('#tools [data-tool=lstyle]'); await p.click('.pop [data-v=dotted]'); await p.waitForTimeout(50);
ok('dotted line style', await ev(() => document.querySelector('#lines path.vis').getAttribute('stroke-dasharray')?.startsWith('0.01')));
await p.click('#tools [data-tool=lstart]'); await p.click('.pop [data-v=dot]'); await p.waitForTimeout(50);
ok('dot marker at start', await ev(() => !!document.querySelector('#lines marker circle')));

ok('no page errors', errs.length === 0, errs.join(' | '));
await p.screenshot({ path: process.env.SHOT || '/tmp/parity.png' });
const fails = res.filter(r => r[0] === 'FAIL');
res.forEach(r => console.log(r[0], r[1], r[2] ? '— ' + r[2] : ''));
console.log(`\n${res.length - fails.length}/${res.length} passed`);
await b.close();

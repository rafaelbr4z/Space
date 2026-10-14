// Fluxo de atualização dentro do app, com window.__TAURI__ simulado (updater + process).
import { chromium } from '/home/claude/.npm-global/lib/node_modules/playwright/index.mjs';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
const errs = []; p.on('pageerror', e => errs.push(e.message));
const res = []; const ok = (n, c, d = '') => res.push([c ? 'PASS' : 'FAIL', n, c ? '' : d]);
await p.addInitScript(() => {
  window.__updLog = [];
  const fake = { version: '9.9.9', downloadAndInstall: async (cb) => { cb({ event: 'Started', data: { contentLength: 1000 } }); await new Promise(r => setTimeout(r, 150)); cb({ event: 'Progress', data: { chunkLength: 400 } }); await new Promise(r => setTimeout(r, 300)); cb({ event: 'Progress', data: { chunkLength: 600 } }); cb({ event: 'Finished', data: {} }); window.__updLog.push('installed'); } };
  window.__TAURI__ = { updater: { check: async () => { window.__updLog.push('check'); return window.__noUpdate ? null : fake; } }, process: { relaunch: async () => window.__updLog.push('relaunch') },
    dialog: {}, fs: {}, opener: { openUrl() {} }, window: { getCurrentWindow: () => ({ setFullscreen: async () => {} }) } };
});
await p.goto('file://' + process.cwd() + '/test/index.html'); await p.waitForTimeout(500);
ok('version is embedded in the page', await p.evaluate(() => /^\d+\.\d+\.\d+$/.test(window.__SPACE_VERSION || '')));
await p.waitForTimeout(6300);
ok('checks for updates by itself shortly after opening', await p.evaluate(() => window.__updLog.includes('check')));
ok('shows update bar with new version', await p.evaluate(() => { const u = document.querySelector('#updbar'); return !!u && /9\.9\.9 is available/.test(u.textContent) && /You have/.test(u.textContent); }));
await p.screenshot({ path: process.env.SHOT1 || '/tmp/upd1.png' });
await p.click('#updbar .ul'); await p.waitForTimeout(80);
ok('Later hides the bar', await p.evaluate(() => !document.querySelector('#updbar')));
await p.click('#help'); await p.waitForTimeout(120);
ok('Shortcuts window shows version and Check for Updates', await p.evaluate(() => { const r = document.querySelector('.hver'); return !!r && r.textContent.includes('Space ' + window.__SPACE_VERSION) && !!r.querySelector('#hupd'); }));
await p.click('#hupd'); await p.waitForTimeout(150);
ok('manual check reopens the update bar', await p.evaluate(() => !!document.querySelector('#updbar') && window.__updLog.filter(x => x === 'check').length === 2));
await p.click('#updbar .uu'); await p.waitForTimeout(250);
ok('Update shows download progress', await p.evaluate(() => { const u = document.querySelector('#updbar'); return u.classList.contains('busy') && /Downloading/.test(u.textContent); }));
await p.screenshot({ path: process.env.SHOT2 || '/tmp/upd2.png' });
await p.waitForTimeout(500);
ok('installs, saves and restarts', await p.evaluate(() => window.__updLog.join(',').endsWith('installed,relaunch') && /Restarting/.test(document.querySelector('#updbar').textContent)));
await p.evaluate(() => { document.querySelector('#updbar')?.remove(); window.__noUpdate = true; });
await p.click('#help'); await p.waitForTimeout(100); await p.click('#hupd'); await p.waitForTimeout(200);
ok('up to date message when there is nothing new', await p.evaluate(() => /up to date/.test(document.querySelector('#toast')?.textContent || '')));
ok('no page errors', errs.length === 0, errs.join(' | '));
res.forEach(r => console.log(r[0], r[1], r[2] ? '— ' + r[2] : ''));
console.log(`\n${res.filter(r => r[0] === 'PASS').length}/${res.length} passed`);
await b.close();

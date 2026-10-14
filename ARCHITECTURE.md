# Arquitetura

O Space é **uma única página web** (HTML + CSS + JavaScript puro, sem framework e sem bundler) embrulhada num app de desktop Tauri 2. O mesmo arquivo roda em três lugares:

| Saída do build | Para quê |
|---|---|
| `space.html` | preview publicado como artifact no claude.ai |
| `app/index.html` + `app/libs/` | o que o app de desktop carrega (com libs locais, funciona offline) |
| `test/index.html`, `test/check.js` | testes Playwright e checagem de sintaxe (`node --check test/check.js`) |

## Pastas

```
src/
  markup.html     estrutura da tela (header, barra, stage, Unsorted, modais)
  style.css       todo o CSS, em blocos por versão (o fim do arquivo sobrescreve o começo)
  app.js          núcleo: estado, persistência, render, seleção, drag & drop, edição, menus, teclado, boot
  parity.js       rodada de paridade v0.6 (menus de contexto, atalhos, colisão, colar, linhas, cores, player)
  parity2.js      rodada v0.7 (comentário anexado, busca, ⌘[ ⌘], apresentação, export, visualizador,
                  Quick Notes, documento, barra personalizável)
  desktop.js      ponte com o Tauri (salvar arquivo, abrir links no navegador, tela cheia) — só age com window.__TAURI__
build.py          junta tudo num HTML só, embute os ícones Lucide e gera as três saídas
vendor/           package.json com lucide-static (ícones) + vendor/libs (html2canvas, jsPDF, JSZip)
assets/icon.svg   ícone do app (fonte); `npx tauri icon assets/icon.png -o src-tauri/icons` gera os demais
src-tauri/        casca de desktop (Rust): Cargo.toml, tauri.conf.json, capabilities/, src/lib.rs
test/             testes Playwright (round2.mjs, parity.mjs, tour.mjs, new.mjs, stress2.mjs)
docs/             design system, fatos do Milanote (REA), relatório de comparação
.github/workflows build.yml: gera .dmg (Mac) e .exe (Windows)
```

## Como o build monta o JavaScript

`app.js` é uma IIFE. Perto do fim dele existe o marcador `/*@@PARITY@@*/`, logo antes de `seed e boot`. O `build.py` troca o marcador pelo conteúdo de `parity.js` + `parity2.js` + `desktop.js`. Por isso **tudo compartilha o mesmo escopo**: os módulos usam e redefinem funções do núcleo diretamente (`render`, `S`, `drag`, `toolBtn`…). Declarações de função são içadas (hoisting), então o núcleo pode chamar funções definidas nos módulos (ex.: `renderQN()`, `attachComments()`, `applyFilter()`). Variáveis `let/const` dos módulos só existem depois que o código chega nelas — use `var` se o núcleo precisar delas antes.

Os ícones vêm de `lucide-static` (versão fixa 0.460.0). O dicionário `MAP` no `build.py` liga nome interno → arquivo SVG; `bi_*` são ícones de quadro, `br_*` marcas. Na página eles ficam em `window.__ICONS` / `ICONS`.

## Estado e modelo de dados

```js
S = { els, root:'home', cur, sel:Set, view:{[boardId]:{x,y,z}}, undo, redo, clip, editing, inboxOpen,
      meta:{ viewed:{[boardId]:ts}, tools:{[tool]:bool} }, nav:{back,fwd}, filter, ui, present, draw, … }
```

Tudo é um **elemento** num mapa plano `S.els` (igual ao Milanote):

```js
{ id, type, parentId, section, x, y, z, index, w, color, bg, locked, trashed, created, modified, content:{…} }
```

- `section`: `canvas` (posição x/y/z no quadro), `list` (dentro de coluna, lista de tarefas ou Quick Notes; ordem por `index`), `inbox` (Unsorted do quadro), `attached` (comentário preso a um cartão), `root`.
- Tipos: note, link, image, file, board, column, tasks/task, line, swatch, comment, doc, map, drawing (+ table e sketch legados).
- Ids especiais: `home` (quadro raiz) e `quicknotes` (raiz das Quick Notes, tipo `qnroot`).
- Grade de 10px; cartão padrão 340px (`CARD_W`). `color` = faixa/linha/cor do quadro; `bg` = fundo do cartão ou `transparent`.
- Linhas guardam `content.a/b` (ponto ou `el` grudado), `ctrl` (curva), estilos de ponta, traço e espessura.

## Persistência

IndexedDB `space-db`, duas stores:
- `doc` → chave `main`: `{gen, els, view, cur, inboxOpen, meta, savedAt}` (gravado com debounce de 250ms em `save()`).
- `blobs` → arquivos e imagens enviados, por `blobId`.

`GEN` (hoje 3) apaga dados antigos uma única vez quando muda — **não aumente sem querer**. Desfazer/refazer guarda snapshots JSON de `S.els` (`commit()` antes de cada mudança, até 80 passos). Backup completo (JSON com blobs em base64) pelo painel de export.

No app de desktop, o IndexedDB fica dentro do armazenamento do WebView, ligado à origem `http://localhost:47470`. **A porta é fixa de propósito**: mudar a porta muda a origem e o app "perde" os dados (eles continuam no disco, mas noutra origem).

## Render e interação

- `render()` reconstrói o quadro atual (`#world`), as linhas (SVG `#lines`), o Unsorted e as Quick Notes; depois chama `applyView`, `renderTools`, `applyFilter`, `renderQN`. `refreshEl(id)` troca só um nó.
- `elNode(e)` cria o DOM de cada tipo. Comentários anexados entram como `.atts` dentro do cartão.
- Drag & drop é próprio (pointer events, não HTML5): `onElDown` → `drag` → `startGhost`/`findDrop` → `finishPointer`. Alvos: canvas, coluna, quadro, Unsorted, lixeira, Quick Notes (`qnDropTarget`) e anexar comentário (`attachDropTarget`, espera 450ms parado).
- Barra lateral (`renderTools`) muda por modo: criar (`renderCreateTools`, com "More" quando falta altura ou a ferramenta está desligada), seleção (ferramentas por tipo), texto, desenho.
- Colisão (`parity.js`): um ResizeObserver empurra os cartões de baixo quando um cartão cresce (regras do Milanote: gap máx. 3, até 15 movimentos).

## App de desktop (Tauri 2)

`src-tauri/src/lib.rs` sobe o plugin **localhost** na porta 47470 e abre a janela apontando para `http://localhost:47470` (não `tauri://`). Motivos: players do YouTube/Vimeo exigem origem http com Referer (senão dão erro 153) e a origem fixa mantém os dados.

- `withGlobalTauri: true` expõe `window.__TAURI__`. A capability `default` libera IPC para `http://localhost:*` (campo `remote`).
- Plugins: `dialog` + `fs` (salvar exportações e downloads com "Salvar como…"), `opener` (links externos no navegador padrão).
- `desktop.js`: `appSave(nome, dados)` é usado por `saveOut`, `downloadFile` e pelo visualizador; links `http(s)` e `window.open` vão para `opener.openUrl`.
- `disable_drag_drop_handler()` deixa o arrastar de arquivos do Finder chegar na página.
- Libs de export e PDF (html2canvas, jsPDF, JSZip, pdf.js 3.11.174) são carregadas de `app/libs/` quando `window.__SPACE_APP` é verdadeiro (`loadScript`), senão do cdnjs.

O CI (`build.yml`) instala Node, Python e Rust, roda `build.py` e `tauri-action`. Mac: alvo `aarch64-apple-darwin` (Apple Silicon). O app não é assinado nem notarizado (ver README para abrir).

## Testes

Playwright, importado do caminho global (`/home/claude/.npm-global/lib/node_modules/playwright/index.mjs` no ambiente do Claude; ajuste para `import { chromium } from 'playwright'` numa máquina com `npm i -D playwright`). Rodar `python3 build.py` antes.

- `test/round2.mjs` (96) — itens da v0.7. `test/parity.mjs` (46) — v0.6. `tour.mjs` — passeio geral. `new.mjs` — ferramentas e seed. `stress2.mjs` — linhas e arrastos (1 falso negativo conhecido).
- `window.__space` expõe `S, render, save, mk, addEl, commit, view, applyView, canvasKids, listKids, inboxKids, openBoard, navBack, navFwd` para montar cenários.
- Pegadinhas: pointer capture redireciona o `click`; no Linux use Control no lugar de ⌘; elementos cortados por `overflow` ainda contam como visíveis; CDNs ficam bloqueados no sandbox — os testes de export usam `p.route` para servir `vendor/libs`.

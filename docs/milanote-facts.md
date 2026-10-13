# Milanote — fatos extraídos do código-fonte (REA)

Fonte: app de desktop do Milanote (v3.18.138) → `app.asar` → `build/*.js.map` com `sourcesContent` → 10.068 arquivos originais (`src/client`, `src/common`). Para reextrair: copiar o `app.asar` de `/Applications/Milanote.app/Contents/Resources/`, extrair com `npx @electron/asar extract`, e ler os `sourcesContent` dos `.js.map`.
Placar Space × Milanote: [rea-report.html](rea-report.html).

## Menu de contexto — fundo (canvasContextMenuConfig.ts)
Paste | Undo, Redo | Select All | New Note, Link, To-do, Line, Board, Column, Comment, Table | Change Board Background (Show Dot Grid, cores, Choose Custom Color, Revert to Default) | New Image/File Placeholder | New Public Template.
Paste do menu cola no ponto clicado (getCanvasSpecifiedPasteLocations), só elementos do próprio Milanote.

## Menu de contexto — elemento (elementContextMenuConfig.ts + predicates)
- clipboard: Paste (só coluna selecionada + clipboard cheio), Cut ⌘X, Copy ⌘C, Paste Styles ⌘⌥V, Duplicate ⌘D, Create Synced Copy, Move to Trash ⌫
- naming: Rename ↩ (container exceto to-do, documento, arquivo, link)
- board: Open in New Tab, Find Original Board (alias), Create a Shortcut to This Board, Copy a Link to This Board, Convert to Template / Revert
- media: Download Original Image(s) / Download, Open File / Copy Link to File, Replace Image / Replace Preview (vídeo), Add Image (link sem imagem), Copy Link Address, Crop Image to Fit Dot Grid
- grouping: Group into Column (2+, mesmo quadro), Connect with Lines (2+ no canvas, árvore mínima de Prim)
- conversion: Convert to Note / Document / Board
- lock: Lock/Unlock Position · arrangement: Bring to Front, Send to Back
- metadata: Created by … / modified …

## Atalhos (keyboardShortcuts.js)
⌫/⌘⌫ trash · ⌥` move to Unsorted · setas nudge (⇧ = maior) · ⌘F busca · Esc deselect/sair apresentação · ↩ edita · ⌘Z/⌘⇧Z/⌘Y · ⌘⌥P apresentação · ⌘A · ⌘D duplicar · ⌘⇧↑/↓ ordem · ⌥W/D/S/A/H/V alinhar · ⌘⌥V paste styles · ⌘⌥⇧V / ⌘⌥⇧H distribuir · ⌘↩ novo elemento do mesmo tipo · ⌥↩ ação secundária · ⌘⇧, / ⌘⇧. grade · ⌘⇧D tema · ⌘U quadro pai · ⌘⇧U descer · Space pan · ⌘\ Unsorted · / atalhos · ⌘K connect · ⌘+/−/0 zoom · Z fit · duplo clique = nota · ⌥+arrastar duplica · ctrl+[ / ctrl+] voltar/avançar (no Mac pelo menu History).
Markdown ao digitar: `#` `##` `*` `1.` `[]` `>` `!` ``` `---`

## Toolbar
- Criar (ordem): Note, Link, To-do, Line, Board, Column, Comment, Table, Sketch, Color, Document, Audio, Map, Video, Heading, [More], divisor, Image, Upload, Draw.
- Padrão de ferramentas principais (DEFAULT_PRIMARY_TOOLS): Note, Link, To-do, Line, Board, Column, Table, Comment + Image, Upload, Draw. Desligadas vão sempre para o More; as que não cabem na altura também (collapseItemsToFit). Preferência em Settings → Toolbar.
- Selecionado por tipo: card = Color, Label, Reaction, Comment, Alignment, Distribute, Connect, menu · board = Color, Icon, Rename · column = Color, Rename · link = Color, Media, Display info, Rename, Caption · image = Color, Transparent, Edit drawing, Caption · file = Color, Display mode, Rename, Caption, Loop, Autoplay · line = Color, Start, End, Label, Style, Weight · swatch = Custom color, Color display, Caption · to-do = Color, Title · comment = Color, Detach, Remove, Collapse · document = Color, Display mode, Rename, Caption.
- Texto: Block styles, Insert (board link, divider, emoji, mention), Bold, Italic, Strike, Underline, Bullet, Numbered, Indent, Unindent, Center, Inline code, Hyperlink. Estilos: Large heading, Normal heading, Normal text, Small text, Callout, Quote block, Code block.

## Comportamentos
- Colisão: quando um elemento cresce, os de baixo são empurrados mantendo o gap (gap > 3 unidades vira 2). Máx. 15 movimentos; desligado 5 s após carregar.
- Colar externo: taskList → element → table → file → captionText → taskList → link → html → plainText. Destino: Unsorted, índice 0.
- Larguras em unidades de grade: padrão 34, mínimo 8. Duplo clique na alça de resize alterna 34 ⇄ largura natural.
- Cores: GREY #bbbec3, CYAN #62dbc8, GREEN #7cd651, BROWN #d58558, YELLOW #ffd14d, ORANGE #ff8d48, RED #ff5757, PINK #ff6ed4, PURPLE #ad6fff, BLUE #4ebafd, DEEP_BLUE #5882f8 + transparente + custom. Colunas usam tons claros.
- Comentário anexado: seção ATTACHED; posição padrão x 100%, y 2rem do cartão; anexa após 500ms de mouse parado sobre o cartão (AttachModeHoverWatcher).
- Arrastar vários: preserva os deslocamentos entre os elementos (unscaledElementOffsetsMap).
- Busca (BoardSearchPanel): resultados por quadro com caminho, contagem, até 5 trechos (+N more); vazio mostra recentes; marcadores de data (humanTime); ordenar por last viewed / last modified / relevance; filter_query / filter_ids filtram o quadro.
- Apresentação: chaves hide-comments, disable-editing, allow-focus-mode (localStorage `milanote.presentation.*`); foco amplia o cartão numa camada própria.
- Export do quadro: PDF standard/high, PNG · linear (com sub-boards): DOCX, Markdown, Plain text · Download all files (ZIP). Export do documento: PDF, Word, Markdown, Plain text.
- Arquivos: PDF e texto abrem em visualizador nativo (iframe); mídia no player; demais em vista de detalhe com download.
- Quick Notes: quadro-raiz especial, lista em popup no header, contador.
- Unsorted vazio: "A place to put things while you decide where they should go". Lixeira guarda 7 dias.

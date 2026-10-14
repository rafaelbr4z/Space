# Changelog

## v0.9.6 — 2026-10-14
- **Botão fixo "Templates"** no canto inferior direito, logo acima do zoom. Abre o seletor em qualquer quadro, inclusive nos que já têm conteúdo ou em que o seletor foi fechado. Em quadro com conteúdo, o template entra abaixo do que já existe (a prévia mostra onde vai ficar). O botão some enquanto o seletor está aberto.

## v0.9.5 — 2026-10-14
- **Templates no canto inferior direito** (como o Milanote): em quadro vazio aparece "Choose a template"; clicar num template mostra a prévia ao vivo no quadro, "Use this template" aplica (com desfazer), o X dispensa para aquele quadro. Criar um quadro novo não abre mais o modal de templates.
- **Seletor de cor próprio**: "Choose Custom Color" (fundo do quadro) e a cor personalizada dos cartões abrem ao lado de onde foram chamados, com área de cor, matiz, hex e conta-gotas.
- Header mais limpo: saíram os botões Fit (atalho Z continua), Unsorted (a aba no canvas continua) e Templates.

## v0.9.4 — 2026-10-14
- **Distribute** de verdade: Horizontally coloca os cartões selecionados numa linha com espaçamento igual (Vertically, numa coluna). Usa o espaço que já existe entre eles quando dá; senão, 20px.
- Seleção de vários cartões mostra só **Distribute** (a ferramenta Alignment saiu; alinhar texto continua no modo de texto).
- **Lixeira só no header**: a da barra lateral saiu; arrastar um cartão até a lixeira do header também apaga. Com cartões selecionados, o botão Trash da barra continua sendo "apagar seleção".
- Botão de apresentação escondido do header por enquanto (o atalho ⌘⌥P continua).

## v0.9.3 — 2026-10-14
- **Prévia de PDF:** o cartão do PDF mostra a primeira página (com o número de páginas) e o visualizador mostra todas as páginas, roláveis (pdf.js, também offline no app).

## v0.9.2 — 2026-10-14
- Ícone do quadro virou um bloco na cor do quadro com ícone ou letra monocromático (branco nas cores escuras, escuro nas claras; sem cor = cinza). Resolve o quadro invisível dentro de colunas no tema escuro.

## v0.9.1 — 2026-10-13
- **Ícones Heroicons v2 outline** (MIT, heroicons.com), escolha do Braz. Traço de 1,5px. Todos os 170 ícones do app vêm do Heroicons (sem mistura); onde não há desenho exato (alinhamento, recuo, citação, marcas como YouTube), usa o mais próximo da própria biblioteca.

## v0.9.0 — 2026-10-13
- **Design system "Space Apple"**: estilos da Apple compilados no Refero (apple.com, MacBook Pro, iPhone 18 Pro, AirPods, Watch Ultra, Things) unificados num só sistema. Tom em vez de sombra, vidro plano (desfoque + saturação, sem brilho de borda), um azul só para ação e seleção, botões em pílula, menus no padrão macOS.
- Paleta escura Apple (#141415 / #1d1d1f / #333336, texto #f5f5f7 / #a1a1a6) e clara (#f5f5f7 / #ffffff).
- **Ícones Phosphor Regular** (MIT) no lugar do Lucide, mais próximos dos SF Symbols.
- Marca do header sem gradiente (mini ícone do app).
- Corrigido: a lista de ícones de quadro não era definida (ícones dos templates apareciam como texto e o seletor de ícone vinha vazio).

## v0.8.0 — 2026-10-13
- **App de desktop (Tauri 2):** Mac Apple Silicon e Windows a partir do mesmo código. Página servida em `http://localhost:47470` (YouTube toca e os dados persistem), "Salvar como…" nativo para exportações e downloads, links abrem no navegador padrão, tela cheia nativa na apresentação, arrastar arquivos do Finder, libs de export offline.
- **Glass novo** no estilo da referência "Source BTN": borda especular fina e clara, contorno escuro, topo mais escuro e brilho na base; pílulas e botões de vidro (Present, Download, Export, toggles, aba ativa do seletor).
- **Tema escuro ardósia** como padrão (o botão de tema continua alternando e lembrando a escolha).
- Ícone do app (provisório, até a marca própria).
- Repositório organizado com README, CONTEXT, ARCHITECTURE, CLAUDE.md, CHANGELOG e docs/.

## v0.7 — 2026-10-13
Segunda rodada de paridade com o Milanote (conferida via REA):
1. Comentário anexado a cartões (segurar sobre o cartão, ferramenta Comment, Detach).
2. Vários cartões de dentro de uma coluna arrastam juntos.
3. Busca nova: resultados por quadro com trechos destacados, recentes, datas, ordenação, setas, filtro do quadro atual.
4. Voltar/avançar entre quadros (⌘[ ⌘], botões do mouse).
5. Apresentação com opções (esconder comentários, bloquear edição, foco no cartão).
6. Exportação completa: PDF padrão/alta qualidade, PNG, Word, Markdown, texto, ZIP de arquivos.
7. Visualizador de arquivos (PDF, texto, imagem, vídeo, áudio) com download.
8. Quick Notes no topo.
9. Documento em modal grande com export próprio.
10. Barra personalizável com "More".

## v0.6 — 2026-10-13
- Paridade v1 a partir do código do Milanote: menus de contexto (fundo e cartão), atalhos, colisão entre cartões, ordem de colar, linhas (curva, pontas, estilos, espessura, alça rápida), paleta de cores com Background/Top strip, player de áudio, legendas, modos de exibição.
- Removidos Table, Sketch e Draw da barra. Ícones Lucide monocromáticos; cantos menores; mais espaço na barra; primeiro glass com borda.
- v0.6.3: alça de redimensionar dentro do cartão.

## v0.5
- Interface em inglês. Barra com a ordem do Milanote. Cartões novos: Comment, Table, Sketch, Document, Map, Audio, Video, desenho livre. Quadros dentro de colunas.

## v0.3 – v0.4
- Visual Apple (SF Pro, cinzas de sistema, materiais translúcidos), tema claro/escuro.

## v0.1 – v0.2
- Primeiro protótipo: canvas, notas, links com preview, imagens, colunas, listas, quadros aninhados, Unsorted, lixeira, desfazer, export. Teste de estilo Frame.io (descartado).

# Changelog

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

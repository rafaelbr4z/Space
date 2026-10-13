# Design system (v0.8)

Base provisória até a marca própria do Braz. Tokens ficam no `:root` do `src/style.css`; o bloco "v0.8 — glass" no fim do arquivo é o que vale hoje.

## Tema
- **Escuro ardósia (padrão):** canvas `#39414a` com grade de pontos `rgba(220,232,240,.13)`; cartão `#262b31`; texto `#eef2f5` / `#a9b4bd` / `#77838d`.
- **Claro:** canvas `#e3e3e8`; cartão `#fff`; texto `#1d1d1f` / `#6e6e73` / `#aeaeb2`.
- Acento `#0a84ff` (seleção) / `#0071e3`. Perigo `#ff3b30`.
- O botão de tema alterna e salva em `localStorage` (`space-theme`).

## Glass ("Source BTN")
Referência: botão circular e pílula de vidro sobre fundo ardósia, com borda que reage à luz.

Receita dos **painéis** (barra, Unsorted, Quick Notes, popups, menus, modais, toast, HUD):
- fundo `--g-fill` translúcido + `backdrop-filter: blur(30px) saturate(150%)`;
- `radial-gradient` claro na base (cáustica, `--g-caustic`) e `linear-gradient` escuro no topo (`--g-top`);
- contorno escuro de 1px por fora (`--g-edge`) + sombra interna no topo (`--g-inner`) + sombra projetada (`--g-drop`);
- borda especular de 1,5px num `::before` com máscara: forte no topo, some nas laterais, volta na base, com reforço diagonal no canto inferior direito (`--g-rim-*`). Painéis grandes usam a borda a 60%.

Receita dos **botões de vidro** (Present, Download, Export, + Note, ferramenta ativa, aba ativa do seletor, botões de modal): mesma ideia com `box-shadow` internos — luz 1,5px no topo, 1px na base, sombra interna curta e contorno escuro.

Toggles: trilho afundado + botão branco com brilho na base.

## Forma
Cartão 7px · UI 6px · painel 14px · pílula 980px. Barra lateral 66px com 6px entre ferramentas (2px em telas até 960px de altura).

## Tipografia
Fonte do sistema (SF Pro no Mac): base 13px, tracking -.01em; títulos 600/700. Mono: SF Mono.

## Ícones
Lucide (`lucide-static` 0.460.0) monocromáticos, traço 1,6–1,75. Ícones de quadro `bi_*` pintados pela cor do quadro. Marcas de links (YouTube, Instagram…) também em linha.

## Movimento
Popups 160ms `cubic-bezier(.19,1,.22,1)`; gaveta 300ms `cubic-bezier(.32,.72,0,1)`; foco da apresentação 280ms.

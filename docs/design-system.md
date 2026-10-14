# Design system — Space Apple (v0.9)

Fonte da verdade: o artifact **Space Apple** (Design System) no claude.ai — tokens, componentes com preview e regras de uso. Este arquivo resume o que o app aplica.

Origem: estilos da Apple compilados no Refero (styles.refero.design): apple.com, Apple (España) MacBook Pro / obsidian, iPhone 18 Pro, AirPods 5, Apple Watch Ultra 4 e o app Things.

## Princípios
- Tom, não sombra: profundidade por superfície (`canvas` → `column` → `surface`) e contornos de 0,5px. Sombra só no que flutua.
- Vidro plano: `backdrop-filter: blur(20px) saturate(180%)`; `glass-bar` em barras fixas, `glass-pop` em popovers/menus/modais. Sem brilho de borda.
- Um azul: `accent` (#2997ff escuro / #0071e3 claro) para seleção, links e foco; `action` (#0071e3) para o único botão principal.
- SF Pro do sistema, títulos em 600, tracking negativo.
- Ícones Phosphor Regular, monocromáticos.

## Tokens (escuro / claro)
| Token | Escuro | Claro | Uso |
|---|---|---|---|
| canvas | #141415 | #f5f5f7 | fundo do quadro |
| surface | #1d1d1f | #ffffff | cartões |
| column | #1b1b1d | #ebebef | colunas |
| control | #333336 | #e8e8ed | pílulas, segmentado, hover |
| glass-bar | rgba(29,29,31,.72) | rgba(250,250,252,.72) | header, barra, Unsorted |
| glass-pop | rgba(44,44,46,.88) | rgba(255,255,255,.9) | popovers, menus, modais |
| text / text-2 / text-3 | #f5f5f7 / #a1a1a6 / #6e6e73 | #1d1d1f / #6e6e73 / #86868b | texto |
| accent / action | #2997ff / #0071e3 | #0071e3 / #0071e3 | seleção / botão principal |

Raios: cartão 8, item 6, popover 12, barra lateral 18, botões 980 (pílula).
No código: bloco "v0.9 — Space Apple" no fim de `src/style.css`; os tokens novos alimentam as variáveis antigas (`--bg`, `--card`, `--ink`…).

## Ícones
`build.py` usa Phosphor (`vendor/node_modules/@phosphor-icons/core`) pelo mapa `src/icons_phosphor.py`; `SPACE_ICONS=lucide python3 build.py` volta ao Lucide.

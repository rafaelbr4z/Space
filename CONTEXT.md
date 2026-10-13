# Contexto do projeto

## Quem e por quê

Rafael Braz é motion designer, generalista 3D e editor de vídeo em Brasília (campanhas de alto padrão do mercado imobiliário). Ele usa o Milanote para guardar referências, links e imagens, mas o plano gratuito trava em 100 itens e o workspace dele já passa de 900. O **Space** nasceu como um clone pessoal do Milanote para:

1. ter tudo que o Milanote faz, sem limite e com os dados no próprio computador;
2. depois, melhorar com recursos e uma identidade visual dele.

Braz não programa. Ele avalia pelo visual e pelo uso, dá feedback curto e deixa as decisões técnicas com quem estiver desenvolvendo (hoje, Claude). A conversa é em português; a interface do app é em inglês, a pedido dele.

## Uso principal

Biblioteca pessoal de links, referências e imagens, organizada em quadros. Recursos de colaboração/conta do Milanote ficam fora, salvo o compartilhamento com cliente (abaixo).

## Regras de trabalho (combinadas com o Braz)

1. **Paridade primeiro.** O Space tem que ficar igual ao Milanote e funcionando; só depois entram coisas novas.
2. **Sempre comparar via REA.** Cada rodada usa o processo de engenharia reversa (ferramenta REA / skill `engenharia-reversa-app`, github.com/morluto/rea) no app de desktop do Milanote. O pacote do Milanote traz source maps, então o código original pode ser lido. Os fatos ficam em `docs/milanote-facts.md` e o placar em `docs/rea-report.html`.
3. **Testar antes de entregar.** Cada recurso ganha teste automatizado (Playwright) e conferência visual por screenshot.
4. **Documentar sempre.** Mudanças relevantes atualizam CHANGELOG, e quando mexem na estrutura, ARCHITECTURE e CLAUDE.md.
5. **Fluxo de avaliação:** o Braz avalia pelo preview (artifact no claude.ai) ou pelo app instalado; o que depende de web (players do YouTube/Spotify) só funciona fora do claude.ai.

## Decisões

| Data | Decisão |
|---|---|
| 2026-10-13 | Nome **Space**. Interface em inglês. |
| 2026-10-13 | Fora do app: Table, Sketch e Draw (cartões antigos ainda abrem; "Draw on" em imagem continua). |
| 2026-10-13 | Visual: cantos menos arredondados, mais espaço entre ícones, ícones monocromáticos (Lucide), sem emoji colorido. |
| 2026-10-13 | Glass no estilo da referência "Source BTN": borda especular fina e clara, contorno escuro por fora, superfície mais escura no topo e brilho na base. Tema escuro (ardósia) como padrão. |
| 2026-10-13 | App de desktop com **Tauri 2** (Mac Apple Silicon primeiro; Windows sai do mesmo código). Repositório GitHub **privado**. |
| 2026-10-13 | Importador do Milanote é a menor prioridade (dá para copiar e colar). |

## Onde estamos (v0.8)

Paridade praticamente completa com o Milanote (70 itens iguais no relatório REA). Falta: busca de imagens (Pexels, precisa de internet e chave de API) e uma galeria de templates mais rica.

## Roteiro

1. App de Mac rodando no dia a dia (v0.8) → corrigir o que aparecer no uso real.
2. Dados também numa pasta visível do computador (backup automático em arquivos).
3. Pexels e templates.
4. Marca e design system próprios do Braz (o glass atual é a base).
5. Compartilhar um quadro online para o cliente ver, aprovar e comentar (conta/cadastro só se for necessário — decidir depois).
6. Importador do Milanote.

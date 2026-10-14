# Space

Quadros visuais pessoais, no estilo do Milanote: notas, links, imagens, arquivos, colunas, listas e linhas soltos num canvas infinito. Feito para ser a biblioteca pessoal de referências, links e imagens do Rafael Braz, sem limite de itens e com tudo guardado no próprio computador.

- **Local-first:** os dados ficam no seu computador (IndexedDB dentro do app). Nada vai para servidor.
- **Paridade com o Milanote primeiro:** cada recurso é conferido contra o código do Milanote antes de virar "igual" (veja [CONTEXT.md](CONTEXT.md)).
- **Mac e Windows:** o mesmo código gera os dois apps (Tauri 2).

## Instalar (Mac)

1. Baixe o `Space_x.y.z_aarch64.dmg` em **github.com/rafaelbr4z/Space/releases**.
2. Abra o `.dmg` e arraste o **Space** para **Aplicativos**.
3. O app ainda não é assinado pela Apple. Na primeira vez, se o macOS disser que o app "está danificado" ou "não pode ser aberto", rode no Terminal:
   ```
   xattr -cr /Applications/Space.app
   ```
   e abra de novo. (Alternativa: botão direito no app → **Abrir**.)

Depois da primeira instalação o app se atualiza sozinho: ele procura versões novas ao abrir (e a cada 6 horas) e mostra "Space x.y.z is available" com o botão **Update**. Também dá para procurar na mão em **?** → *Check for Updates…*.

No Windows: rode o instalador `Space_x.y.z_x64-setup.exe`. Se o SmartScreen avisar, clique em *Mais informações → Executar assim mesmo*.

## Usar

| Ação | Como |
|---|---|
| Criar | arraste uma ferramenta da barra esquerda para o quadro, ou duplo clique no vazio (nota) |
| Colar | ⌘V com imagem, link, texto ou tabela → vai para o **Unsorted** |
| Organizar | arraste para colunas, quadros, Unsorted ou Quick Notes; Shift seleciona vários |
| Buscar | ⌘F — busca em todos os quadros e filtra o quadro atual |
| Navegar | duplo clique abre um quadro; ⌘[ e ⌘] voltam e avançam; ⌘U sobe |
| Apresentar | ícone de apresentação no topo (ou ⌘⌥P) |
| Exportar | ícone de download no topo: PDF, PNG, Word, Markdown, texto, ZIP de arquivos e backup |
| Atalhos | tecla `/` ou o ícone de ajuda |

## Desenvolver

Requisitos: Python 3, Node 20+, Rust (stable). No Linux, também as bibliotecas do WebKitGTK (veja a doc do Tauri).

```bash
npm install                 # CLI do Tauri
npm install --prefix vendor # ícones Lucide usados pelo build
python3 build.py            # gera space.html, app/ (desktop) e test/index.html
npx tauri dev               # abre o app em modo desenvolvimento
npx tauri build             # gera o instalador da sua máquina
node test/round2.mjs        # testes (Playwright; veja ARCHITECTURE.md)
```

O build no GitHub (`.github/workflows/build.yml`) roda a cada push na `main`, gera o `.dmg` e o `.exe`, assina a atualização e publica em Releases com a tag `v<versão>`. Para lançar uma atualização, suba a versão em `package.json`, `src-tauri/Cargo.toml` e `src-tauri/tauri.conf.json`. Segredo do repositório: `TAURI_SIGNING_PRIVATE_KEY` (sem ela não dá para publicar atualizações; guarde uma cópia).

## Documentação

- [CONTEXT.md](CONTEXT.md) — por que o app existe, decisões, regras de trabalho e roteiro.
- [ARCHITECTURE.md](ARCHITECTURE.md) — como o código está organizado: modelo de dados, build, módulos, app de desktop, testes.
- [CLAUDE.md](CLAUDE.md) — instruções para sessões de IA que forem mexer no código.
- [CHANGELOG.md](CHANGELOG.md) — o que mudou em cada versão.
- [docs/design-system.md](docs/design-system.md) — tokens, glass, ícones.
- [docs/milanote-facts.md](docs/milanote-facts.md) — fatos extraídos do código do Milanote (REA).
- [docs/rea-report.html](docs/rea-report.html) — relatório de comparação Space × Milanote.

Projeto privado, de uso pessoal.

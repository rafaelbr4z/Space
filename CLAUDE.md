# Instruções para sessões de IA

Leia primeiro: [CONTEXT.md](CONTEXT.md) (regras e decisões) e [ARCHITECTURE.md](ARCHITECTURE.md) (código).

## Quem é o usuário
Rafael Braz, motion designer. Não programa. Fale com ele em **português do Brasil**, curto e sem jargão; mostre resultado (preview, screenshot, app) em vez de explicar código. A interface do app é em **inglês**.

## Regras que não mudam
1. **Paridade com o Milanote primeiro.** Recurso novo só depois que o equivalente do Milanote estiver igual e funcionando.
2. **Compare sempre via REA** antes de implementar: leia o código do Milanote (app de desktop → `app.asar` → source maps). Registre fatos novos em `docs/milanote-facts.md` e o placar em `docs/rea-report.html`.
3. Não reintroduza Table, Sketch nem Draw na barra (decisão do Braz).
4. Ícones Heroicons outline (mapa em `src/icons_heroicons.py`), monocromáticos, sem emoji colorido na UI.
5. Toda mudança: teste automatizado + screenshot conferido + CHANGELOG atualizado.

## Comandos
```bash
python3 build.py              # sempre depois de editar src/
node --check test/check.js    # sintaxe do JS montado
node test/round2.mjs          # e test/parity.mjs, tour.mjs, new.mjs
npx tauri dev | npx tauri build
```

## Cuidados
- `app.js`, `parity.js`, `parity2.js` e `desktop.js` viram **um escopo só** (IIFE). Antes de criar função ou constante, procure o nome no `test/check.js` montado — nomes repetidos quebram o app inteiro (`Identifier has already been declared`).
- `commit()` antes de qualquer mudança em `S.els` (desfazer). `save()` depois.
- Não mude `GEN` (apaga os dados de todo mundo) nem a porta 47470 do app de desktop (troca a origem e esconde os dados salvos).
- Listeners do stage: o `pointerdown` de `#stage` captura o ponteiro; botões dentro do stage precisam de `stopPropagation` no `pointerdown`, senão o clique se perde.
- Novos popups: use `openPop` ou `.pop` (ganha o glass automaticamente). Variáveis de cor estão no `:root` e nos blocos de tema escuro no fim do `style.css`; não existe `--hover` (use `--card-2`).
- No app de desktop, downloads passam por `saveOut`/`appSave`; não use `<a download>` direto.
- O preview no claude.ai bloqueia embeds do YouTube/Maps (`IS_HOSTED`); teste esses no app ou no `dist/Space.zip`.

## Branches (combinado com o Braz em 2026-10-14)
- **`feat-space-braz`**: todo trabalho novo. Commit e push na `feat-space-braz`, publique o preview (artifact) para o Braz testar. Push na `feat-space-braz` **não** gera instalador nem atualização.
- **`main`**: só a versão estável. Quando o Braz disser que a versão está 100%: suba a versão (package.json, src-tauri/Cargo.toml, src-tauri/tauri.conf.json), feche a seção do CHANGELOG com o número e a data, faça merge da `feat-space-braz` na `main` e push. O Actions publica a release e o app instalado oferece "Update".
- Nunca faça commit direto na `main`. No CHANGELOG, o que ainda não foi lançado fica em `## Próxima versão (dev)`.

## Publicar
- Preview: artifact `https://claude.ai/artifact/1msw9bEboLXJkRHfXVwMvL` (publicar `space.html`).
- App: repositório público `github.com/rafaelbr4z/Space` (código e instaladores num repo só). Cada push na `main` dispara o GitHub Actions, que gera `.dmg` (Mac Apple Silicon) e `.exe` e publica em **Releases** com a tag `v<versão>` (o próprio Actions cria a tag; a sessão do Claude não consegue enviar tags nem baixar arquivos do GitHub). O app instalado se atualiza pelo `latest.json` dessas releases, por isso o repositório é público. Nunca coloque chaves ou senhas no repositório. Suba a versão (package.json, Cargo.toml, tauri.conf.json) para gerar uma release nova; mesma versão substitui os arquivos.

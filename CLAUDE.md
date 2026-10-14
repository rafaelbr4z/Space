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

## Publicar
- Preview: artifact `https://claude.ai/artifact/1msw9bEboLXJkRHfXVwMvL` (publicar `space.html`).
- App: tag `vX.Y.Z` → GitHub Actions gera `.dmg`/`.exe` (release em rascunho + artifacts).

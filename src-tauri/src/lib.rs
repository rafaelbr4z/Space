//! Space — casca de desktop (Tauri 2).
//!
//! O app inteiro é a página web gerada por `build.py` (pasta `app/`). Ela é servida em
//! http://localhost:PORT pelo plugin localhost — e não pelo protocolo tauri:// — por dois motivos:
//! 1. players do YouTube/Vimeo exigem uma origem http com Referer (senão dão "erro 153");
//! 2. a porta fixa mantém a mesma origem, então o IndexedDB (onde ficam os boards) persiste entre aberturas.

use tauri::{WebviewUrl, WebviewWindowBuilder};

/// Porta fixa: mudar isso troca a origem e "esconde" os dados salvos.
const PORT: u16 = 47470;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_localhost::Builder::new(PORT).build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        // atualização dentro do app: baixa das Releases do repositório Space (assinado)
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            let url = format!("http://localhost:{}", PORT).parse().expect("valid url");
            WebviewWindowBuilder::new(app, "main", WebviewUrl::External(url))
                .title("Space")
                .inner_size(1440.0, 900.0)
                .min_inner_size(900.0, 600.0)
                // deixa o arrastar-e-soltar de arquivos do Finder chegar na página (HTML5 drop)
                .disable_drag_drop_handler()
                .build()?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Space");
}

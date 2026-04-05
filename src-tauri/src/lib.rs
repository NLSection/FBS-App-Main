use std::fs::OpenOptions;
use std::io::Write;
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tauri::Manager;
use tauri_plugin_dialog::{DialogExt, MessageDialogButtons};
use tauri_plugin_updater::UpdaterExt;
use tauri_plugin_shell::ShellExt;
use tauri_plugin_shell::process::CommandChild;

struct NodeProcess(Mutex<Option<CommandChild>>);

#[tauri::command]
async fn install_update(app: tauri::AppHandle) -> Result<(), String> {
    let update = app.updater().map_err(|e| e.to_string())?
        .check().await.map_err(|e| e.to_string())?
        .ok_or("Geen update beschikbaar")?;
    update.download_and_install(|_, _| {}, || {}).await.map_err(|e| e.to_string())?;
    app.restart();
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(NodeProcess(Mutex::new(None)))
        .setup(|app| {
            let resource_path = app.path().resource_dir()
                .map_err(|e| format!("Kan resource map niet vinden: {e}"))?;

            let server_js = resource_path.join("app").join("server.js");
            let server_js_str = server_js
                .to_string_lossy()
                .trim_start_matches("\\\\?\\")
                .to_string();

            let db_path = format!(
                "{}\\fbs.db",
                server_js_str.trim_end_matches("\\app\\server.js")
            );

            let log_path = std::env::temp_dir().join("fbs-debug.log");
            if let Ok(mut f) = OpenOptions::new().create(true).append(true).open(&log_path) {
                let _ = writeln!(f, "resource_dir: {:?}", app.path().resource_dir());
                let _ = writeln!(f, "server_js pad: {:?}", server_js);
                let _ = writeln!(f, "server_js bestaat: {}", server_js.exists());
                let _ = writeln!(f, "server_js genormaliseerd: {}", server_js_str);
                let _ = writeln!(f, "db_path: {}", db_path);
                let sidecar_path = app.path()
                    .resolve("node-x86_64-pc-windows-msvc.exe",
                             tauri::path::BaseDirectory::Resource);
                let _ = writeln!(f, "sidecar pad: {:?}", sidecar_path);
                if let Ok(ref p) = sidecar_path {
                    let _ = writeln!(f, "sidecar bestaat: {}", p.exists());
                }
            }

            // Start Next.js server via Tauri sidecar (resolvet automatisch het juiste pad)
            let result = app.shell()
                .sidecar("node")
                .map_err(|e| format!("Kan sidecar niet aanmaken: {e}"))?
                .args([server_js_str.as_str()])
                .env("PORT", "3001")
                .env("NODE_ENV", "production")
                .env("DB_PATH", &db_path)
                .spawn();

            let (rx, child) = match result {
                Ok((rx, child)) => (rx, child),
                Err(e) => {
                    let msg = format!(
                        "Kon Node.js server niet starten.\n\nFout: {e}"
                    );
                    app.dialog().message(msg).blocking_show();
                    std::process::exit(1);
                }
            };

            // Node stdout/stderr loggen naar fbs-debug.log
            let log_path_clone = log_path.clone();
            tauri::async_runtime::spawn(async move {
                let mut rx = rx;
                while let Some(event) = rx.recv().await {
                    if let tauri_plugin_shell::process::CommandEvent::Stdout(line)
                        | tauri_plugin_shell::process::CommandEvent::Stderr(line) = event
                    {
                        if let Ok(mut f) = OpenOptions::new()
                            .create(true).append(true).open(&log_path_clone)
                        {
                            let _ = writeln!(f, "[node] {}", String::from_utf8_lossy(&line));
                        }
                    }
                }
            });

            // Sla child process op voor cleanup
            let state = app.state::<NodeProcess>();
            *state.0.lock().unwrap() = Some(child);

            // Health check: wacht tot server bereikbaar is (max 30s)
            let client = reqwest::blocking::Client::builder()
                .timeout(Duration::from_millis(500))
                .build()
                .unwrap();

            let start = Instant::now();
            let max_wait = Duration::from_secs(30);

            loop {
                if client.get("http://localhost:3001").send().is_ok() {
                    break;
                }
                if start.elapsed() > max_wait {
                    app.dialog()
                        .message("De server is niet opgestart binnen 30 seconden.\nDe app wordt afgesloten.")
                        .blocking_show();
                    // Kill child process
                    if let Some(child) = app.state::<NodeProcess>().0.lock().unwrap().take() {
                        let _ = child.kill();
                    }
                    std::process::exit(1);
                }
                std::thread::sleep(Duration::from_millis(500));
            }

            // Update check na succesvolle start
            if let Ok(mut f) = OpenOptions::new().create(true).append(true).open(&log_path) {
                let _ = writeln!(f, "[updater] update check spawn wordt gestart");
            }
            let app_handle = app.handle().clone();
            let log_path_update = log_path.clone();
            tauri::async_runtime::spawn(async move {
                let log = |msg: &str| {
                    if let Ok(mut f) = OpenOptions::new()
                        .create(true).append(true).open(&log_path_update)
                    {
                        let _ = writeln!(f, "[updater] {}", msg);
                    }
                };

                log("update check gestart");
                let updater = match app_handle.updater() {
                    Ok(u) => u,
                    Err(e) => { log(&format!("updater init fout: {e}")); return; }
                };
                let update = match updater.check().await {
                    Ok(Some(update)) => {
                        log(&format!("update gevonden: {}", update.version));
                        update
                    }
                    Ok(None) => { log("geen update"); return; }
                    Err(e) => { log(&format!("update check fout: {e}")); return; }
                };
                let version = update.version.clone();
                let body = update.body.clone().unwrap_or_default();
                let msg = format!(
                    "Versie {} is beschikbaar.\n\n{}\n\nNu installeren?",
                    version, body
                );
                let confirmed = app_handle.dialog()
                    .message(msg)
                    .title("Update beschikbaar")
                    .buttons(MessageDialogButtons::OkCancelCustom("Ja".into(), "Later".into()))
                    .blocking_show();
                if confirmed {
                    log("download gestart");
                    match update.download_and_install(|_, _| {}, || {}).await {
                        Ok(_) => {
                            log("download voltooid, installatie gestart");
                            app_handle.restart();
                        }
                        Err(e) => log(&format!("download/install fout: {e}")),
                    }
                } else {
                    log("gebruiker koos 'Later'");
                }
            });

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                let np = window.state::<NodeProcess>();
                let mut guard = np.0.lock().unwrap();
                if let Some(child) = guard.take() {
                    let _ = child.kill();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![install_update])
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .run(tauri::generate_context!())
        .expect("Fout bij starten van Tauri app");
}

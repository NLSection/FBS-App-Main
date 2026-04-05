use std::fs::OpenOptions;
use std::io::Write;
use std::sync::Mutex;
use std::time::Duration;
use tauri::Manager;
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_shell::ShellExt;
use tauri_plugin_shell::process::CommandChild;
use tauri_plugin_updater::UpdaterExt;

struct NodeProcess(Mutex<Option<CommandChild>>);
struct AppPort(Mutex<Option<u16>>);

#[tauri::command]
async fn install_update(app: tauri::AppHandle) -> Result<(), String> {
    let update = app.updater().map_err(|e| e.to_string())?
        .check().await.map_err(|e| e.to_string())?
        .ok_or("Geen update beschikbaar")?;

    // Kill node VOOR de install
    {
        let np = app.state::<NodeProcess>();
        let mut guard = np.0.lock().unwrap();
        if let Some(child) = guard.take() {
            let pid = child.pid();
            drop(guard);
            let _ = std::process::Command::new("taskkill")
                .args(["/F", "/PID", &pid.to_string()])
                .output();
            std::thread::sleep(std::time::Duration::from_millis(500));
        }
    }

    // Dan pas downloaden en installeren — NSIS herstart de app zelf
    update.download_and_install(|_, _| {}, || {}).await.map_err(|e| e.to_string())?;

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(NodeProcess(Mutex::new(None)))
        .manage(AppPort(Mutex::new(None)))
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

            // Zoek een vrije poort
            let listener = std::net::TcpListener::bind("127.0.0.1:0")
                .map_err(|e| format!("Kan geen vrije poort vinden: {e}"))?;
            let port = listener.local_addr()
                .map_err(|e| format!("Kan poort niet lezen: {e}"))?.port();
            drop(listener);

            *app.state::<AppPort>().0.lock().unwrap() = Some(port);

            if let Ok(mut f) = OpenOptions::new().create(true).append(true).open(&log_path) {
                let _ = writeln!(f, "[app] vrije poort gekozen: {}", port);
            }

            // Start Next.js server via Tauri sidecar op de gekozen poort
            let result = app.shell()
                .sidecar("node")
                .map_err(|e| format!("Kan sidecar niet aanmaken: {e}"))?
                .args([server_js_str.as_str()])
                .env("PORT", &port.to_string())
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

            // Sla child process op voor cleanup
            let state = app.state::<NodeProcess>();
            *state.0.lock().unwrap() = Some(child);

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

            // Health check: wacht tot server bereikbaar is (max 30s)
            let client = reqwest::blocking::Client::builder()
                .timeout(Duration::from_millis(500))
                .build()
                .unwrap();

            let url = format!("http://localhost:{}", port);
            let start = std::time::Instant::now();
            let max_wait = Duration::from_secs(30);

            loop {
                if client.get(&url).send().is_ok() {
                    break;
                }
                if start.elapsed() > max_wait {
                    app.dialog()
                        .message("De server is niet opgestart binnen 30 seconden.\nDe app wordt afgesloten.")
                        .blocking_show();
                    if let Some(child) = app.state::<NodeProcess>().0.lock().unwrap().take() {
                        let _ = child.kill();
                    }
                    std::process::exit(1);
                }
                std::thread::sleep(Duration::from_millis(500));
            }

            // Navigeer webview naar de dynamische poort
            let window = app.get_webview_window("main")
                .ok_or("Kan hoofdvenster niet vinden")?;
            window.navigate(url.parse().map_err(|e| format!("Ongeldige URL: {e}"))?)
                .map_err(|e| format!("Navigatie mislukt: {e}"))?;

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                let np = window.state::<NodeProcess>();
                let mut guard = np.0.lock().unwrap();
                if let Some(child) = guard.take() {
                    let pid = child.pid();
                    drop(guard);
                    let _ = std::process::Command::new("taskkill")
                        .args(["/F", "/PID", &pid.to_string()])
                        .output();
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

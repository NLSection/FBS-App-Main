use std::fs::OpenOptions;
use std::io::Write;
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tauri::Manager;
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_shell::ShellExt;
use tauri_plugin_shell::process::CommandChild;

struct NodeProcess(Mutex<Option<CommandChild>>);

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

            let log_path = std::env::temp_dir().join("fbs-debug.log");
            if let Ok(mut f) = OpenOptions::new().create(true).append(true).open(&log_path) {
                let _ = writeln!(f, "resource_dir: {:?}", app.path().resource_dir());
                let _ = writeln!(f, "server_js pad: {:?}", server_js);
                let _ = writeln!(f, "server_js bestaat: {}", server_js.exists());
                let _ = writeln!(f, "server_js genormaliseerd: {}", server_js_str);
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
                .env("PORT", "3000")
                .env("NODE_ENV", "production")
                .spawn();

            let child = match result {
                Ok((_rx, child)) => child,
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

            // Health check: wacht tot server bereikbaar is (max 30s)
            let client = reqwest::blocking::Client::builder()
                .timeout(Duration::from_millis(500))
                .build()
                .unwrap();

            let start = Instant::now();
            let max_wait = Duration::from_secs(30);

            loop {
                if client.get("http://localhost:3000").send().is_ok() {
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
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .run(tauri::generate_context!())
        .expect("Fout bij starten van Tauri app");
}

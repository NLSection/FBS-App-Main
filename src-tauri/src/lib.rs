use std::process::Command;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let resource_path = app.path().resource_dir()
                .expect("Kan resource map niet vinden");

            let node_path = resource_path
                .join("binaries")
                .join("node");

            let app_path = resource_path
                .join("app");

            // Start Next.js server
            let _child = Command::new(&node_path)
                .arg(app_path.join("server.js"))
                .env("PORT", "3000")
                .env("NODE_ENV", "production")
                .spawn()
                .expect("Kon Node.js server niet starten");

            // Wacht even tot de server opgestart is
            std::thread::sleep(std::time::Duration::from_secs(3));

            Ok(())
        })
        .plugin(tauri_plugin_shell::init())
        .run(tauri::generate_context!())
        .expect("Fout bij starten van Tauri app");
}

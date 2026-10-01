mod audio;
mod commands;
mod library;

use audio::AudioEngine;
use commands::DbState;
use parking_lot::Mutex;
use tauri::{Emitter, Manager};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .setup(|app| {
            // Database
            let conn = library::db::init_db().expect("failed to open library database");
            app.manage(DbState(Mutex::new(conn)));

            // Audio engine: forwards spectrum frames to the webview
            let handle = app.handle().clone();
            let engine = AudioEngine::new(move |payload| {
                let _ = handle.emit("spectrum", &payload);
            })
            .expect("failed to initialize audio engine");
            app.manage(engine);

            // Heal vanished artwork, then watch known folders for changes.
            let h = app.handle().clone();
            std::thread::spawn(move || {
                if let Some(db) = h.try_state::<DbState>() {
                    let repaired = crate::commands::repair_artwork(&db);
                    if repaired > 0 {
                        let _ = h.emit("scan:done", ());
                    }
                    let folders = {
                        let conn = db.0.lock();
                        library::db::list_folders(&conn)
                    };
                    if !folders.is_empty() {
                        crate::commands::rescan_folders_silent(h, folders);
                    }
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::engine_play,
            commands::engine_toggle,
            commands::engine_next,
            commands::engine_prev,
            commands::engine_stop,
            commands::engine_seek,
            commands::engine_set_volume,
            commands::engine_set_repeat,
            commands::engine_set_eq,
            commands::engine_status,
            commands::library_list_tracks,
            commands::library_list_albums,
            commands::library_list_folders,
            commands::library_add_folder,
            commands::library_remove_folder,
            commands::library_rescan_all,
            commands::library_tracks_of_album,
            commands::library_import_files,
            commands::library_repair_artwork,
            commands::playlist_list,
            commands::playlist_create,
            commands::playlist_delete,
            commands::playlist_rename,
            commands::playlist_add_track,
            commands::playlist_remove_track,
            commands::playlist_dedupe,
            commands::playlist_add_folder,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

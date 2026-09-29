//! Tauri IPC commands bridging the webview to the engine and library.

use crate::audio::{AudioEngine, EqSettings, PlayStatus};
use crate::library::db::{self, Album, Playlist, Track};
use parking_lot::Mutex;
use rusqlite::Connection;
use std::sync::Arc;
use tauri::{AppHandle, Emitter, State};

pub struct DbState(pub Mutex<Connection>);

fn art_dir() -> std::path::PathBuf {
    let base = dirs::cache_dir()
        .or_else(dirs::data_dir)
        .unwrap_or_else(std::env::temp_dir);
    let dir = base.join("Crescendo").join("art");
    let _ = std::fs::create_dir_all(&dir);
    dir
}

fn data_db_path() -> std::path::PathBuf {
    dirs::data_dir()
        .map(|d| d.join("Crescendo"))
        .unwrap_or_else(std::env::temp_dir)
        .join("library.db")
}

// ------------------------------------------------------------ playback

#[tauri::command]
pub fn engine_play(engine: State<'_, Arc<AudioEngine>>, paths: Vec<String>, start: usize) {
    engine.load_queue(paths, start);
}

#[tauri::command]
pub fn engine_toggle(engine: State<'_, Arc<AudioEngine>>) {
    engine.toggle();
}

#[tauri::command]
pub fn engine_next(engine: State<'_, Arc<AudioEngine>>) {
    engine.advance(false);
}

#[tauri::command]
pub fn engine_prev(engine: State<'_, Arc<AudioEngine>>) {
    engine.previous();
}

#[tauri::command]
pub fn engine_stop(engine: State<'_, Arc<AudioEngine>>) {
    engine.stop();
}

#[tauri::command]
pub fn engine_seek(engine: State<'_, Arc<AudioEngine>>, sec: f64) {
    engine.seek(sec);
}

#[tauri::command]
pub fn engine_set_volume(engine: State<'_, Arc<AudioEngine>>, volume: f32) {
    engine.set_volume(volume);
}

#[tauri::command]
pub fn engine_set_repeat(engine: State<'_, Arc<AudioEngine>>, mode: u8) {
    engine.set_repeat(mode);
}

#[tauri::command]
pub fn engine_set_eq(
    engine: State<'_, Arc<AudioEngine>>,
    enabled: bool,
    preamp_db: f32,
    gains: Vec<f32>,
) {
    let mut g = [0.0f32; 10];
    for (i, v) in gains.iter().take(10).enumerate() {
        g[i] = v.clamp(-12.0, 12.0);
    }
    engine.set_eq(EqSettings {
        enabled,
        preamp_db: preamp_db.clamp(-12.0, 12.0),
        gains: g,
    });
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EngineStatus {
    pub status: PlayStatus,
    pub position: f64,
    pub index: isize,
    pub queue_len: usize,
}

#[tauri::command]
pub fn engine_status(engine: State<'_, Arc<AudioEngine>>) -> EngineStatus {
    EngineStatus {
        status: engine.status(),
        position: engine.position(),
        index: engine.current_index(),
        queue_len: engine.queue_len(),
    }
}

// ------------------------------------------------------------ library

#[tauri::command]
pub fn library_list_tracks(db: State<'_, DbState>) -> Vec<Track> {
    let conn = db.0.lock();
    db::list_tracks(&conn)
}

#[tauri::command]
pub fn library_list_albums(db: State<'_, DbState>) -> Vec<Album> {
    let conn = db.0.lock();
    db::list_albums(&conn)
}

#[tauri::command]
pub fn library_tracks_of_album(
    db: State<'_, DbState>,
    album: String,
    album_artist: String,
) -> Vec<Track> {
    let conn = db.0.lock();
    db::tracks_of_album(&conn, &album, &album_artist)
}

#[tauri::command]
pub fn library_list_folders(db: State<'_, DbState>) -> Vec<String> {
    let conn = db.0.lock();
    db::list_folders(&conn)
}

#[tauri::command]
pub fn library_add_folder(app: AppHandle, db: State<'_, DbState>, path: String) {
    {
        let conn = db.0.lock();
        db::add_folder(&conn, &path);
    }
    scan_folder_async(app, path, true);
}

#[tauri::command]
pub fn library_remove_folder(db: State<'_, DbState>, path: String) {
    let conn = db.0.lock();
    db::remove_folder(&conn, &path);
}

#[tauri::command]
pub fn library_rescan_all(app: AppHandle, db: State<'_, DbState>) {
    let folders = {
        let conn = db.0.lock();
        db::list_folders(&conn)
    };
    for f in folders {
        scan_folder_async(app.clone(), f, true);
    }
}

/// Rescan without per-file progress spam (used at startup).
pub fn rescan_folders_silent(app: AppHandle, folders: Vec<String>) {
    for f in folders {
        scan_folder_async(app.clone(), f, false);
    }
}

/// Run a scan on a background thread, emitting progress events.
fn scan_folder_async(app: AppHandle, folder: String, with_progress: bool) {
    std::thread::spawn(move || {
        let conn = match Connection::open(data_db_path()) {
            Ok(c) => c,
            Err(e) => {
                let _ = app.emit("scan:error", e.to_string());
                return;
            }
        };
        let cancelled = std::sync::atomic::AtomicBool::new(false);
        let art = art_dir();
        let result = crate::library::scanner::scan_folder(
            &conn,
            &folder,
            &art,
            |done, total| {
                if with_progress {
                    let _ = app.emit("scan:progress", (done, total));
                }
            },
            &cancelled,
        );
        match result {
            Ok(r) => {
                let _ = app.emit("scan:done", &r);
            }
            Err(e) => {
                let _ = app.emit("scan:error", e);
            }
        }
    });
}

// ------------------------------------------------------------ playlists

#[tauri::command]
pub fn playlist_list(db: State<'_, DbState>) -> Vec<Playlist> {
    let conn = db.0.lock();
    db::list_playlists(&conn)
}

#[tauri::command]
pub fn playlist_create(db: State<'_, DbState>, name: String) -> i64 {
    let conn = db.0.lock();
    db::create_playlist(&conn, &name)
}

#[tauri::command]
pub fn playlist_delete(db: State<'_, DbState>, id: i64) {
    let conn = db.0.lock();
    db::delete_playlist(&conn, id);
}

#[tauri::command]
pub fn playlist_rename(db: State<'_, DbState>, id: i64, name: String) {
    let conn = db.0.lock();
    db::rename_playlist(&conn, id, &name);
}

#[tauri::command]
pub fn playlist_add_track(db: State<'_, DbState>, playlist_id: i64, track_id: i64) {
    let conn = db.0.lock();
    db::add_to_playlist(&conn, playlist_id, track_id);
}

#[tauri::command]
pub fn playlist_remove_track(db: State<'_, DbState>, playlist_id: i64, track_id: i64) {
    let conn = db.0.lock();
    db::remove_from_playlist(&conn, playlist_id, track_id);
}

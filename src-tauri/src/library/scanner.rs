//! Recursive library scanner with progress events.

use super::db;
use super::metadata;
use rusqlite::Connection;
use std::collections::HashSet;
use std::path::Path;
use std::sync::atomic::{AtomicBool, Ordering};
use walkdir::WalkDir;

pub const AUDIO_EXTS: [&str; 10] = [
    "mp3", "flac", "m4a", "aac", "wav", "aiff", "aif", "ogg", "opus", "alac",
];

#[derive(serde::Serialize)]
pub struct ScanResult {
    pub added: usize,
    pub updated: usize,
    pub removed: usize,
    pub total: usize,
}

fn is_audio(p: &Path) -> bool {
    p.extension()
        .and_then(|e| e.to_str())
        .map(|e| AUDIO_EXTS.contains(&e.to_ascii_lowercase().as_str()))
        .unwrap_or(false)
}

/// Scan a folder into the DB. Emits `(scanned, total)` progress through `progress`.
pub fn scan_folder(
    conn: &Connection,
    folder: &str,
    art_dir: &Path,
    progress: impl Fn(usize, usize),
    cancelled: &AtomicBool,
) -> Result<ScanResult, String> {
    // collect files first so we can report progress against a total
    let mut files: Vec<String> = Vec::new();
    for entry in WalkDir::new(folder)
        .follow_links(false)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        if cancelled.load(Ordering::Relaxed) {
            return Err("cancelled".into());
        }
        if entry.file_type().is_file() && is_audio(entry.path()) {
            files.push(entry.path().to_string_lossy().to_string());
        }
    }
    let total = files.len();
    let mut added = 0;
    let mut updated = 0;
    let mut keep: HashSet<String> = HashSet::new();

    for (i, path) in files.iter().enumerate() {
        if cancelled.load(Ordering::Relaxed) {
            return Err("cancelled".into());
        }
        keep.insert(path.clone());

        let mtime = std::fs::metadata(path)
            .and_then(|m| m.modified())
            .ok()
            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|d| d.as_secs() as i64)
            .unwrap_or(0);

        // incremental: skip unchanged files
        if db::track_mtime(conn, path) == Some(mtime) {
            progress(i + 1, total);
            continue;
        }

        let was_new = db::track_mtime(conn, path).is_none();
        match metadata::extract(path) {
            Ok(mut t) => {
                // artwork (best-effort; never fails the scan)
                if let Ok((art, pal)) = metadata::extract_artwork(path, art_dir) {
                    t.art_path = Some(art);
                    t.art_palette = Some(pal);
                }
                match db::upsert_track(conn, &t, mtime) {
                    Ok(_) => {
                        if was_new {
                            added += 1;
                        } else {
                            updated += 1;
                        }
                    }
                    Err(e) => eprintln!("crescendo: db insert {path}: {e}"),
                }
            }
            Err(e) => eprintln!("crescendo: metadata {path}: {e}"),
        }
        progress(i + 1, total);
    }

    let removed = db::remove_missing(conn, folder, &keep.iter().cloned().collect::<Vec<_>>());

    Ok(ScanResult { added, updated, removed, total })
}

/// Quick file-count preview before scanning.
#[allow(dead_code)] // used for pre-scan estimates in upcoming UI
pub fn count_audio_files(folder: &str) -> usize {
    WalkDir::new(folder)
        .follow_links(false)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file() && is_audio(e.path()))
        .count()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ext_filter() {
        assert!(is_audio(Path::new("/x/song.FLAC")));
        assert!(is_audio(Path::new("/x/song.m4a")));
        assert!(!is_audio(Path::new("/x/song.txt")));
        assert!(!is_audio(Path::new("/x/song")));
    }

    #[test]
    fn count_works_on_empty_dir() {
        let dir = std::env::temp_dir().join(format!("cresc_test_{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        assert_eq!(count_audio_files(dir.to_str().unwrap()), 0);
        std::fs::remove_dir_all(&dir).ok();
    }
}

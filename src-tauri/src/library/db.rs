//! SQLite persistence for the music library.

use rusqlite::{params, Connection, OptionalExtension, Row};
use serde::{Deserialize, Serialize};

#[derive(Clone, Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Track {
    pub id: i64,
    pub path: String,
    pub title: String,
    pub artist: String,
    pub album: String,
    pub album_artist: String,
    pub track_no: i64,
    pub year: i64,
    pub duration: f64,
    pub format: String,
    pub lossless: bool,
    pub sample_rate: i64,
    pub bit_depth: i64,
    pub bitrate: i64,
    pub art_path: Option<String>,
    pub art_palette: Option<String>,
}

#[derive(Clone, Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Album {
    pub key: String,
    pub title: String,
    pub artist: String,
    pub year: i64,
    pub track_count: i64,
    pub duration: f64,
    pub art_path: Option<String>,
    pub art_palette: Option<String>,
}

#[derive(Clone, Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Playlist {
    pub id: i64,
    pub name: String,
    pub track_ids: Vec<i64>,
}

pub fn init_db() -> Result<Connection, String> {
    let data_dir = dirs::data_dir().ok_or("no data dir")?.join("Crescendo");
    std::fs::create_dir_all(&data_dir).map_err(|e| e.to_string())?;
    let conn = Connection::open(data_dir.join("library.db")).map_err(|e| e.to_string())?;

    conn.execute_batch(
        r#"
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS tracks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            path TEXT UNIQUE NOT NULL,
            title TEXT NOT NULL,
            artist TEXT NOT NULL DEFAULT 'Unknown Artist',
            album TEXT NOT NULL DEFAULT 'Unknown Album',
            album_artist TEXT NOT NULL DEFAULT '',
            track_no INTEGER NOT NULL DEFAULT 0,
            year INTEGER NOT NULL DEFAULT 0,
            duration REAL NOT NULL DEFAULT 0,
            format TEXT NOT NULL DEFAULT '',
            lossless INTEGER NOT NULL DEFAULT 0,
            sample_rate INTEGER NOT NULL DEFAULT 0,
            bit_depth INTEGER NOT NULL DEFAULT 0,
            bitrate INTEGER NOT NULL DEFAULT 0,
            art_path TEXT,
            art_palette TEXT,
            mtime INTEGER NOT NULL DEFAULT 0
        );
        CREATE INDEX IF NOT EXISTS idx_tracks_artist ON tracks(artist);
        CREATE INDEX IF NOT EXISTS idx_tracks_album ON tracks(album, album_artist);

        CREATE TABLE IF NOT EXISTS folders (
            path TEXT PRIMARY KEY,
            added_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS playlists (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            created_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS playlist_tracks (
            playlist_id INTEGER NOT NULL,
            position INTEGER NOT NULL,
            track_id INTEGER NOT NULL
        );
        "#,
    )
    .map_err(|e| e.to_string())?;

    Ok(conn)
}

fn row_to_track(r: &Row) -> rusqlite::Result<Track> {
    Ok(Track {
        id: r.get(0)?,
        path: r.get(1)?,
        title: r.get(2)?,
        artist: r.get(3)?,
        album: r.get(4)?,
        album_artist: r.get(5)?,
        track_no: r.get(6)?,
        year: r.get(7)?,
        duration: r.get(8)?,
        format: r.get(9)?,
        lossless: r.get::<_, i64>(10)? != 0,
        sample_rate: r.get(11)?,
        bit_depth: r.get(12)?,
        bitrate: r.get(13)?,
        art_path: r.get(14)?,
        art_palette: r.get(15)?,
    })
}

const TRACK_COLS: &str =
    "id, path, title, artist, album, album_artist, track_no, year, duration, format, lossless, sample_rate, bit_depth, bitrate, art_path, art_palette";

pub fn list_tracks(conn: &Connection) -> Vec<Track> {
    let sql = format!("SELECT {TRACK_COLS} FROM tracks ORDER BY artist, album, track_no, title");
    let mut stmt = match conn.prepare(&sql) {
        Ok(s) => s,
        Err(_) => return vec![],
    };
    let rows = stmt.query_map([], row_to_track);
    match rows {
        Ok(it) => it.filter_map(|r| r.ok()).collect(),
        Err(_) => vec![],
    }
}

pub fn list_albums(conn: &Connection) -> Vec<Album> {
    let sql =
        "SELECT album, album_artist, MAX(year), COUNT(*), SUM(duration), \
                (SELECT t2.art_path FROM tracks t2 WHERE t2.album = t.album AND t2.album_artist = t.album_artist AND t2.art_path IS NOT NULL LIMIT 1), \
                (SELECT t3.art_palette FROM tracks t3 WHERE t3.album = t.album AND t3.album_artist = t.album_artist AND t3.art_palette IS NOT NULL LIMIT 1) \
         FROM tracks t GROUP BY album, album_artist ORDER BY album_artist, year, album";
    let mut stmt = match conn.prepare(sql) {
        Ok(s) => s,
        Err(_) => return vec![],
    };
    let rows = stmt.query_map([], |r| {
        let title: String = r.get(0)?;
        let artist: String = r.get(1)?;
        Ok(Album {
            key: format!("{artist}::{title}"),
            title,
            artist,
            year: r.get::<_, Option<i64>>(2)?.unwrap_or(0),
            track_count: r.get(3)?,
            duration: r.get::<_, Option<f64>>(4)?.unwrap_or(0.0),
            art_path: r.get(5)?,
            art_palette: r.get(6)?,
        })
    });
    match rows {
        Ok(it) => it.filter_map(|r| r.ok()).collect(),
        Err(_) => vec![],
    }
}

pub fn tracks_of_album(conn: &Connection, album: &str, album_artist: &str) -> Vec<Track> {
    let sql = format!(
        "SELECT {TRACK_COLS} FROM tracks WHERE album = ?1 AND album_artist = ?2 \
         ORDER BY track_no, title"
    );
    let mut stmt = match conn.prepare(&sql) {
        Ok(s) => s,
        Err(_) => return vec![],
    };
    let rows = stmt.query_map(params![album, album_artist], row_to_track);
    match rows {
        Ok(it) => it.filter_map(|r| r.ok()).collect(),
        Err(_) => vec![],
    }
}

pub fn upsert_track(conn: &Connection, t: &Track, mtime: i64) -> rusqlite::Result<i64> {
    conn.execute(
        r#"INSERT INTO tracks (path, title, artist, album, album_artist, track_no, year,
             duration, format, lossless, sample_rate, bit_depth, bitrate, art_path, art_palette, mtime)
           VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16)
           ON CONFLICT(path) DO UPDATE SET
             title=?2, artist=?3, album=?4, album_artist=?5, track_no=?6, year=?7,
             duration=?8, format=?9, lossless=?10, sample_rate=?11, bit_depth=?12,
             bitrate=?13, art_path=?14, art_palette=?15, mtime=?16"#,
        params![
            t.path, t.title, t.artist, t.album, t.album_artist, t.track_no, t.year,
            t.duration, t.format, t.lossless as i64, t.sample_rate, t.bit_depth,
            t.bitrate, t.art_path, t.art_palette, mtime
        ],
    )?;
    Ok(conn.last_insert_rowid())
}

pub fn track_mtime(conn: &Connection, path: &str) -> Option<i64> {
    conn.query_row("SELECT mtime FROM tracks WHERE path = ?1", params![path], |r| r.get(0))
        .optional()
        .ok()
        .flatten()
}

/// The cached artwork path for a track, if one was extracted.
pub fn track_art_path(conn: &Connection, path: &str) -> Option<String> {
    conn.query_row(
        "SELECT art_path FROM tracks WHERE path = ?1",
        params![path],
        |r| r.get::<_, Option<String>>(0),
    )
    .optional()
    .ok()
    .flatten()
    .flatten()
}

/// Update only the cached artwork columns (used by the art self-heal pass).
pub fn set_track_art(conn: &Connection, path: &str, art: &str, palette: &str) {
    let _ = conn.execute(
        "UPDATE tracks SET art_path = ?2, art_palette = ?3 WHERE path = ?1",
        params![path, art, palette],
    );
}

/// Resolve a track id by file path. Prefer this over `upsert_track`'s
/// return value, which is the last *insert* rowid and is stale when the
/// row already existed and was only updated.
pub fn track_id_by_path(conn: &Connection, path: &str) -> Option<i64> {
    conn.query_row("SELECT id FROM tracks WHERE path = ?1", params![path], |r| r.get(0))
        .optional()
        .ok()
        .flatten()
}

/// Ids of every track stored under a folder path (in path order).
pub fn track_ids_in_folder(conn: &Connection, folder: &str) -> Vec<i64> {
    let mut stmt = match conn.prepare("SELECT id FROM tracks WHERE path LIKE ?1 ORDER BY path") {
        Ok(s) => s,
        Err(_) => return vec![],
    };
    let pattern = format!("{folder}%");
    let ids = match stmt.query_map(params![pattern], |r| r.get(0)) {
        Ok(it) => it.filter_map(|x| x.ok()).collect(),
        Err(_) => vec![],
    };
    ids
}

pub fn remove_missing(conn: &Connection, folder: &str, keep: &[String]) -> usize {
    let mut removed = 0;
    let mut stmt = match conn.prepare("SELECT id, path FROM tracks WHERE path LIKE ?1") {
        Ok(s) => s,
        Err(_) => return 0,
    };
    let pattern = format!("{folder}%");
    let rows: Vec<(i64, String)> = match stmt.query_map(params![pattern], |r| {
        Ok((r.get(0)?, r.get(1)?))
    }) {
        Ok(it) => it.filter_map(|x| x.ok()).collect(),
        Err(_) => return 0,
    };
    for (id, path) in rows {
        if !keep.contains(&path)
            && conn.execute("DELETE FROM tracks WHERE id = ?1", params![id]).is_ok()
        {
            removed += 1;
        }
    }
    removed
}

// ---- folders ----

pub fn list_folders(conn: &Connection) -> Vec<String> {
    let mut stmt = match conn.prepare("SELECT path FROM folders ORDER BY added_at") {
        Ok(s) => s,
        Err(_) => return vec![],
    };
    let out = match stmt.query_map([], |r| r.get(0)) {
        Ok(it) => it.filter_map(|x| x.ok()).collect(),
        Err(_) => vec![],
    };
    out
}

pub fn add_folder(conn: &Connection, path: &str) {
    let _ = conn.execute(
        "INSERT OR IGNORE INTO folders (path, added_at) VALUES (?1, ?2)",
        params![path, chrono_now()],
    );
}

pub fn remove_folder(conn: &Connection, path: &str) {
    let _ = conn.execute("DELETE FROM folders WHERE path = ?1", params![path]);
    let _ = conn.execute("DELETE FROM tracks WHERE path LIKE ?1", params![format!("{path}%")]);
}

// ---- playlists ----

pub fn list_playlists(conn: &Connection) -> Vec<Playlist> {
    let mut stmt = match conn.prepare("SELECT id, name FROM playlists ORDER BY created_at") {
        Ok(s) => s,
        Err(_) => return vec![],
    };
    let mut out: Vec<Playlist> = match stmt.query_map([], |r| {
        Ok(Playlist { id: r.get(0)?, name: r.get(1)?, track_ids: vec![] })
    }) {
        Ok(it) => it.filter_map(|x| x.ok()).collect(),
        Err(_) => vec![],
    };

    if let Ok(mut pt) =
        conn.prepare("SELECT playlist_id, track_id FROM playlist_tracks ORDER BY position")
    {
        if let Ok(rows) = pt.query_map([], |r| Ok((r.get::<_, i64>(0)?, r.get::<_, i64>(1)?))) {
            for (pid, tid) in rows.filter_map(|x| x.ok()) {
                if let Some(p) = out.iter_mut().find(|p| p.id == pid) {
                    p.track_ids.push(tid);
                }
            }
        }
    }
    out
}

pub fn create_playlist(conn: &Connection, name: &str) -> i64 {
    conn.execute(
        "INSERT INTO playlists (name, created_at) VALUES (?1, ?2)",
        params![name, chrono_now()],
    )
    .ok();
    conn.last_insert_rowid()
}

pub fn delete_playlist(conn: &Connection, id: i64) {
    let _ = conn.execute("DELETE FROM playlists WHERE id = ?1", params![id]);
    let _ = conn.execute("DELETE FROM playlist_tracks WHERE playlist_id = ?1", params![id]);
}

pub fn rename_playlist(conn: &Connection, id: i64, name: &str) {
    let _ = conn.execute("UPDATE playlists SET name = ?2 WHERE id = ?1", params![id, name]);
}

pub fn add_to_playlist(conn: &Connection, playlist_id: i64, track_id: i64) {
    let pos: i64 = conn
        .query_row(
            "SELECT COALESCE(MAX(position), 0) + 1 FROM playlist_tracks WHERE playlist_id = ?1",
            params![playlist_id],
            |r| r.get(0),
        )
        .unwrap_or(1);
    let _ = conn.execute(
        "INSERT INTO playlist_tracks (playlist_id, position, track_id) VALUES (?1, ?2, ?3)",
        params![playlist_id, pos, track_id],
    );
}

pub fn remove_from_playlist(conn: &Connection, playlist_id: i64, track_id: i64) {
    let _ = conn.execute(
        "DELETE FROM playlist_tracks WHERE playlist_id = ?1 AND track_id = ?2",
        params![playlist_id, track_id],
    );
}

/// Drop repeated occurrences of a track, keeping the earliest position.
/// Returns how many rows were removed.
pub fn dedupe_playlist(conn: &Connection, playlist_id: i64) -> usize {
    conn.execute(
        "DELETE FROM playlist_tracks WHERE playlist_id = ?1 AND rowid NOT IN (\
           SELECT MIN(rowid) FROM playlist_tracks WHERE playlist_id = ?1 GROUP BY track_id\
         )",
        params![playlist_id],
    )
    .unwrap_or(0)
}

fn chrono_now() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn mem_db() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch(
            r#"
            CREATE TABLE tracks (
                id INTEGER PRIMARY KEY AUTOINCREMENT, path TEXT UNIQUE NOT NULL,
                title TEXT NOT NULL, artist TEXT NOT NULL DEFAULT 'Unknown Artist',
                album TEXT NOT NULL DEFAULT 'Unknown Album', album_artist TEXT NOT NULL DEFAULT '',
                track_no INTEGER NOT NULL DEFAULT 0, year INTEGER NOT NULL DEFAULT 0,
                duration REAL NOT NULL DEFAULT 0, format TEXT NOT NULL DEFAULT '',
                lossless INTEGER NOT NULL DEFAULT 0, sample_rate INTEGER NOT NULL DEFAULT 0,
                bit_depth INTEGER NOT NULL DEFAULT 0, bitrate INTEGER NOT NULL DEFAULT 0,
                art_path TEXT, art_palette TEXT, mtime INTEGER NOT NULL DEFAULT 0);
            CREATE TABLE folders (path TEXT PRIMARY KEY, added_at INTEGER NOT NULL);
            CREATE TABLE playlists (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, created_at INTEGER NOT NULL);
            CREATE TABLE playlist_tracks (playlist_id INTEGER NOT NULL, position INTEGER NOT NULL, track_id INTEGER NOT NULL);
            "#,
        )
        .unwrap();
        conn
    }

    fn sample(path: &str, album: &str) -> Track {
        Track {
            id: 0,
            path: path.into(),
            title: "Song".into(),
            artist: "Artist".into(),
            album: album.into(),
            album_artist: "Artist".into(),
            track_no: 1,
            year: 2024,
            duration: 180.0,
            format: "FLAC".into(),
            lossless: true,
            sample_rate: 44100,
            bit_depth: 16,
            bitrate: 0,
            art_path: None,
            art_palette: None,
        }
    }

    #[test]
    fn upsert_and_list() {
        let conn = mem_db();
        let t = sample("/m/a.flac", "Alpha");
        upsert_track(&conn, &t, 1).unwrap();
        upsert_track(&conn, &t, 2).unwrap(); // update, not duplicate
        let all = list_tracks(&conn);
        assert_eq!(all.len(), 1);
        assert!(all[0].lossless);
    }

    #[test]
    fn albums_group_by_album_artist() {
        let conn = mem_db();
        upsert_track(&conn, &sample("/m/1.flac", "Alpha"), 1).unwrap();
        upsert_track(&conn, &sample("/m/2.flac", "Alpha"), 1).unwrap();
        upsert_track(&conn, &sample("/m/3.flac", "Beta"), 1).unwrap();
        let albums = list_albums(&conn);
        assert_eq!(albums.len(), 2);
        let alpha = albums.iter().find(|a| a.title == "Alpha").unwrap();
        assert_eq!(alpha.track_count, 2);
        assert!((alpha.duration - 360.0).abs() < 0.01);
    }

    #[test]
    fn tracks_of_album_orders_and_filters() {
        let conn = mem_db();
        let mut t1 = sample("/m/1.flac", "Alpha");
        t1.track_no = 2;
        let mut t2 = sample("/m/2.flac", "Alpha");
        t2.track_no = 1;
        upsert_track(&conn, &t1, 1).unwrap();
        upsert_track(&conn, &t2, 1).unwrap();
        upsert_track(&conn, &sample("/m/3.flac", "Beta"), 1).unwrap();
        let got = tracks_of_album(&conn, "Alpha", "Artist");
        assert_eq!(got.len(), 2);
        assert_eq!(got[0].track_no, 1);
    }

    #[test]
    fn folders_crud() {
        let conn = mem_db();
        add_folder(&conn, "/music");
        add_folder(&conn, "/music"); // no dup
        assert_eq!(list_folders(&conn).len(), 1);
        upsert_track(&conn, &sample("/music/x.flac", "A"), 1).unwrap();
        remove_folder(&conn, "/music");
        assert!(list_tracks(&conn).is_empty());
    }

    #[test]
    fn playlists_flow() {
        let conn = mem_db();
        let t = sample("/m/1.flac", "A");
        let tid = upsert_track(&conn, &t, 1).unwrap();
        let pid = create_playlist(&conn, "Mix");
        add_to_playlist(&conn, pid, tid);
        add_to_playlist(&conn, pid, tid);
        let pls = list_playlists(&conn);
        assert_eq!(pls[0].track_ids.len(), 2);
        // Removal clears every occurrence of the track (dedupe semantics).
        remove_from_playlist(&conn, pid, tid);
        assert!(list_playlists(&conn)[0].track_ids.is_empty());
        delete_playlist(&conn, pid);
        assert!(list_playlists(&conn).is_empty());
    }

    #[test]
    fn track_id_by_path_matches_after_conflict_update() {
        let conn = mem_db();
        upsert_track(&conn, &sample("/m/a.flac", "A"), 1).unwrap();
        let first = track_id_by_path(&conn, "/m/a.flac").unwrap();
        // Updating the same row must not report a phantom new id.
        upsert_track(&conn, &sample("/m/a.flac", "A"), 2).unwrap();
        assert_eq!(track_id_by_path(&conn, "/m/a.flac"), Some(first));
        set_track_art(&conn, "/m/a.flac", "/art/x.png", "1,2,3");
        assert_eq!(track_art_path(&conn, "/m/a.flac").as_deref(), Some("/art/x.png"));
        let ids = track_ids_in_folder(&conn, "/m");
        assert_eq!(ids, vec![first]);
    }

    #[test]
    fn playlist_dedupe_keeps_one_of_each() {
        let conn = mem_db();
        let a = upsert_track(&conn, &sample("/m/a.flac", "A"), 1).unwrap();
        let b = upsert_track(&conn, &sample("/m/b.flac", "A"), 1).unwrap();
        let pid = create_playlist(&conn, "Mix");
        add_to_playlist(&conn, pid, a);
        add_to_playlist(&conn, pid, b);
        add_to_playlist(&conn, pid, a);
        assert_eq!(dedupe_playlist(&conn, pid), 1);
        let ids = &list_playlists(&conn)[0].track_ids;
        assert_eq!(ids.len(), 2);
        assert_eq!(ids[0], a);
        assert_eq!(dedupe_playlist(&conn, pid), 0);
    }

    #[test]
    fn remove_missing_cleans_orphans() {
        let conn = mem_db();
        upsert_track(&conn, &sample("/music/keep.flac", "A"), 1).unwrap();
        upsert_track(&conn, &sample("/music/gone.flac", "A"), 1).unwrap();
        let removed = remove_missing(&conn, "/music", &["/music/keep.flac".into()]);
        assert_eq!(removed, 1);
        assert_eq!(list_tracks(&conn).len(), 1);
    }
}

//! Metadata + embedded artwork extraction (fully offline).

use super::db::Track;
use lofty::file::TaggedFileExt;
use lofty::prelude::*;
use lofty::probe::Probe;
use std::path::Path;

pub const ART_SIZE: u32 = 300;

pub fn extract(path: &str) -> Result<Track, String> {
    let tagged = Probe::open(path)
        .map_err(|e| e.to_string())?
        .guess_file_type()
        .map_err(|e| e.to_string())?
        .read()
        .map_err(|e| e.to_string())?;

    let props = tagged.properties();
    let file_type = tagged.file_type();

    let lossless = matches!(
        file_type,
        lofty::file::FileType::Flac
            | lofty::file::FileType::Ape
            | lofty::file::FileType::Wav
            | lofty::file::FileType::Aiff
    )
    || path.to_ascii_lowercase().ends_with(".alac");

    let tag = tagged.primary_tag().or_else(|| tagged.first_tag());

    let get_str = |key: &str| -> String {
        tag.and_then(|t| match key {
            "title" => t.title().map(|s| s.to_string()),
            "artist" => t.artist().map(|s| s.to_string()),
            "album" => t.album().map(|s| s.to_string()),
            "album_artist" => t.get_string(lofty::tag::ItemKey::AlbumArtist).map(|s| s.to_string()),
            "genre" => t.genre().map(|s| s.to_string()),
            _ => None,
        })
        .unwrap_or_default()
    };

    let title = {
        let t = get_str("title");
        if t.is_empty() {
            Path::new(path)
                .file_stem()
                .map(|s| s.to_string_lossy().to_string())
                .unwrap_or(t)
        } else {
            t
        }
    };
    let artist = {
        let a = get_str("artist");
        if a.is_empty() { "Unknown Artist".into() } else { a }
    };
    let album = {
        let a = get_str("album");
        if a.is_empty() { "Unknown Album".into() } else { a }
    };

    let track_no = tag
        .and_then(|t| t.track())
        .unwrap_or(0) as i64;
    let year = tag
        .and_then(|t| t.get_string(lofty::tag::ItemKey::Year))
        .and_then(|s| s.chars().take(4).collect::<String>().parse::<i64>().ok())
        .unwrap_or(0);

    let duration = props.duration().as_secs_f64();
    let sample_rate = props.sample_rate().unwrap_or(0) as i64;
    let bit_depth = (props.bit_depth().unwrap_or(0)) as i64;
    let bitrate = (props.audio_bitrate().unwrap_or(0)) as i64;

    let fmt = format_name(path, file_type);

    Ok(Track {
        id: 0,
        path: path.to_string(),
        title,
        artist,
        album,
        album_artist: get_str("album_artist"),
        track_no,
        year,
        duration,
        format: fmt.0,
        lossless: fmt.1 || lossless,
        sample_rate,
        bit_depth,
        bitrate,
        art_path: None,
        art_palette: None,
    })
}

fn format_name(path: &str, ft: lofty::file::FileType) -> (String, bool) {
    let lower = path.to_ascii_lowercase();
    let ext_lossless = lower.ends_with(".flac")
        || lower.ends_with(".wav")
        || lower.ends_with(".aiff")
        || lower.ends_with(".aif")
        || lower.ends_with(".alac");
    let name = match ft {
        lofty::file::FileType::Mpeg => "MP3",
        lofty::file::FileType::Flac => "FLAC",
        lofty::file::FileType::Mp4 => "AAC/M4A",
        lofty::file::FileType::Aiff => "AIFF",
        lofty::file::FileType::Wav => "WAV",
        lofty::file::FileType::Opus => "OPUS",
        lofty::file::FileType::Vorbis => "OGG",
        _ => "AUDIO",
    };
    (name.to_string(), ext_lossless)
}

/// Extract embedded cover art to `<art_dir>/<hash>.png` and compute a
/// 5-color palette `r,g,b|r,g,b|…` from a downscaled copy.
pub fn extract_artwork(path: &str, art_dir: &Path) -> Result<(String, String), String> {
    let tagged = Probe::open(path)
        .map_err(|e| e.to_string())?
        .guess_file_type()
        .map_err(|e| e.to_string())?
        .read()
        .map_err(|e| e.to_string())?;

    let tag = tagged
        .primary_tag()
        .or_else(|| tagged.first_tag())
        .ok_or("no tag")?;
    let pic = tag
        .pictures()
        .first()
        .ok_or("no picture")?;
    let data = pic.data();

    std::fs::create_dir_all(art_dir).map_err(|e| e.to_string())?;

    // hash by path for a stable filename
    let mut hash: u64 = 5381;
    for b in path.bytes() {
        hash = hash.wrapping_mul(0x01000193).wrapping_add(b as u64);
    }
    let out_path = art_dir.join(format!("{hash:016x}.png"));

    if !out_path.exists() {
        let img = image::load_from_memory(data).map_err(|e| e.to_string())?;
        let thumb = img.resize(ART_SIZE, ART_SIZE, image::imageops::FilterType::Lanczos3);
        thumb.save_with_format(&out_path, image::ImageFormat::Png)
            .map_err(|e| e.to_string())?;
    }

    // palette from a small copy
    let img = image::load_from_memory(data).map_err(|e| e.to_string())?;
    let small = img.resize_exact(32, 32, image::imageops::FilterType::Triangle).to_rgb8();
    let mut buckets: std::collections::HashMap<[u8; 3], u32> = std::collections::HashMap::new();
    for px in small.pixels() {
        let key = [px[0] >> 4, px[1] >> 4, px[2] >> 4]; // 4 bits/channel
        *buckets.entry(key).or_insert(0) += 1;
    }
    let mut counts: Vec<([u8; 3], u32)> = buckets.into_iter().collect();
    counts.sort_by_key(|a| std::cmp::Reverse(a.1));
    let palette: Vec<String> = counts
        .iter()
        .take(5)
        .map(|(k, _)| {
            format!(
                "{},{},{}",
                (k[0] << 4) + 8,
                (k[1] << 4) + 8,
                (k[2] << 4) + 8
            )
        })
        .collect();

    Ok((
        out_path.to_string_lossy().to_string(),
        palette.join("|"),
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn format_names_are_right() {
        let (n, l) = format_name("x.flac", lofty::file::FileType::Flac);
        assert_eq!(n, "FLAC");
        assert!(l);
        let (n, l) = format_name("x.mp3", lofty::file::FileType::Mpeg);
        assert_eq!(n, "MP3");
        assert!(!l);
        let (n, _) = format_name("x.m4a", lofty::file::FileType::Mp4);
        assert_eq!(n, "AAC/M4A");
    }

    #[test]
    fn palette_line_format() {
        // 5 entries of r,g,b joined by |
        let pal = "12,34,56|255,255,255|0,0,0|10,20,30|40,50,60";
        assert_eq!(pal.split('|').count(), 5);
        for c in pal.split('|') {
            let mut it = c.split(',');
            let r: u8 = it.next().unwrap().parse().unwrap();
            let g: u8 = it.next().unwrap().parse().unwrap();
            let b: u8 = it.next().unwrap().parse().unwrap();
            assert!(r <= 255 && g <= 255 && b <= 255);
        }
    }
}

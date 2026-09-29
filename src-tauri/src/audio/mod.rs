//! Crescendo audio engine.
//!
//! Pipeline: file → symphonia decoder (rodio) → PCM tap (ring buffer)
//! → output device. A worker thread drains the ring, runs a 4096-pt FFT
//! and emits spectrum events; a supervisor thread auto-advances the queue.

pub mod eq;

use parking_lot::Mutex;
use std::sync::atomic::AtomicU64;
use ringbuf::traits::{Consumer, Producer, Split};
use ringbuf::{HeapCons, HeapProd, HeapRb};
use rodio::source::{SeekError, Source};
use rodio::{Decoder, DeviceSinkBuilder, Player};
use rustfft::{num_complex::Complex, FftPlanner};
use serde::{Deserialize, Serialize};
use std::fs::File;
use std::io::BufReader;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;

pub const FFT_SIZE: usize = 4096;
pub const BANDS: usize = 64;
pub const WAVEFORM: usize = 256;
const RING_CAP: usize = 1 << 16; // ~1.5 s @ 44.1k mono

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct SpectrumPayload {
    pub bands: Vec<f32>,
    pub waveform: Vec<f32>,
    pub bass: f32,
    pub mid: f32,
    pub treble: f32,
    pub energy: f32,
}

#[derive(Clone, Copy, PartialEq, Eq, Serialize, Debug)]
#[serde(rename_all = "lowercase")]
pub enum PlayStatus {
    Stopped,
    Playing,
    Paused,
}

struct EngineState {
    status: PlayStatus,
    queue: Vec<String>,
    index: isize,
    repeat: u8, // 0 off, 1 all, 2 one
    volume: f32,
}

/// Shared EQ settings, hot-swappable while audio plays.
pub struct EqShared {
    settings: Mutex<EqSettings>,
    version: AtomicU64,
}

#[derive(Clone)]
pub struct EqSettings {
    pub enabled: bool,
    pub preamp_db: f32,
    pub gains: [f32; 10],
}

impl EqShared {
    fn new() -> Self {
        Self {
            settings: Mutex::new(EqSettings { enabled: false, preamp_db: 0.0, gains: [0.0; 10] }),
            version: AtomicU64::new(0),
        }
    }
    pub fn set(&self, s: EqSettings) {
        *self.settings.lock() = s;
        self.version.fetch_add(1, Ordering::Relaxed);
    }
    fn snapshot(&self) -> (EqSettings, u64) {
        (self.settings.lock().clone(), self.version.load(Ordering::Relaxed))
    }
}

pub struct AudioEngine {
    _device: rodio::MixerDeviceSink,
    player: Player,
    state: Arc<Mutex<EngineState>>,
    eq: Arc<EqShared>,
    prod: Arc<Mutex<HeapProd<f32>>>,
    fft_stop: Arc<AtomicBool>,
    sup_stop: Arc<AtomicBool>,
}

impl Drop for AudioEngine {
    fn drop(&mut self) {
        self.fft_stop.store(false, Ordering::Relaxed);
        self.sup_stop.store(false, Ordering::Relaxed);
    }
}

// ---------------------------------------------------------------- PCM tap

struct TapSource<S> {
    inner: S,
    prod: Arc<Mutex<HeapProd<f32>>>,
    eq: Arc<EqShared>,
    eq_channels: Vec<eq::EqChannel>,
    eq_ver: u64,
    sample_count: usize,
    channels: u16,
    ch_idx: u16,
    frame_acc: f32,
}

impl<S> Iterator for TapSource<S>
where
    S: Source<Item = f32>,
{
    type Item = f32;

    fn next(&mut self) -> Option<f32> {
        let mut s = self.inner.next()?;

        // Hot-swap EQ coefficients when settings change (checked every 256 samples).
        self.sample_count += 1;
        if self.sample_count % 256 == 0 {
            let (settings, ver) = self.eq.snapshot();
            if ver != self.eq_ver {
                self.eq_ver = ver;
                self.eq_channels = self.build_eq_channels(&settings);
            }
        }
        if !self.eq_channels.is_empty() {
            let ch = (self.ch_idx as usize).min(self.eq_channels.len() - 1);
            s = self.eq_channels[ch].process(s as f64) as f32;
        }

        self.frame_acc += s;
        self.ch_idx += 1;
        if self.ch_idx >= self.channels {
            self.ch_idx = 0;
            let mono = self.frame_acc / self.channels as f32;
            self.frame_acc = 0.0;
            let _ = self.prod.lock().push_slice(std::slice::from_ref(&mono));
        }
        Some(s)
    }
}

impl<S> TapSource<S>
where
    S: Source<Item = f32>,
{
    fn build_eq_channels(&self, settings: &EqSettings) -> Vec<eq::EqChannel> {
        if !settings.enabled {
            return vec![];
        }
        let sr = self.inner.sample_rate().get() as f64;
        (0..self.channels)
            .map(|_| eq::EqChannel::new(sr, &settings.gains, settings.preamp_db))
            .collect()
    }
}

impl<S> Source for TapSource<S>
where
    S: Source<Item = f32>,
{
    fn current_span_len(&self) -> Option<usize> {
        self.inner.current_span_len()
    }
    fn channels(&self) -> rodio::ChannelCount {
        self.inner.channels()
    }
    fn sample_rate(&self) -> rodio::SampleRate {
        self.inner.sample_rate()
    }
    fn total_duration(&self) -> Option<Duration> {
        self.inner.total_duration()
    }
    fn try_seek(&mut self, pos: Duration) -> Result<(), SeekError> {
        self.inner.try_seek(pos)
    }
}

// ---------------------------------------------------------------- engine

impl AudioEngine {
    pub fn new<F>(emit_spectrum: F) -> Result<Arc<Self>, String>
    where
        F: Fn(SpectrumPayload) + Send + 'static,
    {
        let device = DeviceSinkBuilder::open_default_sink().map_err(|e| e.to_string())?;
        let player = Player::connect_new(&device.mixer());
        player.pause(); // silent until something plays

        let rb = HeapRb::<f32>::new(RING_CAP);
        let (prod, cons) = rb.split();

        let engine = Arc::new(AudioEngine {
            _device: device,
            player,
            state: Arc::new(Mutex::new(EngineState {
                status: PlayStatus::Stopped,
                queue: vec![],
                index: -1,
                repeat: 0,
                volume: 0.85,
            })),
            eq: Arc::new(EqShared::new()),
            prod: Arc::new(Mutex::new(prod)),
            fft_stop: Arc::new(AtomicBool::new(true)),
            sup_stop: Arc::new(AtomicBool::new(true)),
        });

        // ---- FFT worker ----
        let stop = engine.fft_stop.clone();
        std::thread::spawn(move || {
            fft_worker(cons, stop, emit_spectrum);
        });

        // ---- queue supervisor (auto-advance) ----
        let eng = engine.clone();
        let sup_stop = engine.sup_stop.clone();
        std::thread::spawn(move || {
            while sup_stop.load(Ordering::Relaxed) {
                std::thread::sleep(Duration::from_millis(60));
                let (empty, status) = {
                    let st = eng.state.lock();
                    (eng.player.empty(), st.status)
                };
                if empty && status == PlayStatus::Playing {
                    eng.advance(true);
                }
            }
        });

        Ok(engine)
    }

    // ---- queue ----

    pub fn load_queue(&self, paths: Vec<String>, start: usize) {
        {
            let mut st = self.state.lock();
            st.queue = paths;
            st.index = start as isize;
        }
        self.load_current();
    }

    #[allow(dead_code)] // used by frontend queue jumps in upcoming bridge
    pub fn play_index(&self, i: usize) {
        self.state.lock().index = i as isize;
        self.load_current();
    }

    pub fn set_repeat(&self, mode: u8) {
        self.state.lock().repeat = mode;
    }

    pub fn set_eq(&self, settings: EqSettings) {
        self.eq.set(settings);
    }

    fn current_path(&self) -> Option<String> {
        let st = self.state.lock();
        let i = st.index;
        if i < 0 || i as usize >= st.queue.len() {
            None
        } else {
            Some(st.queue[i as usize].clone())
        }
    }

    fn load_current(&self) {
        let Some(path) = self.current_path() else {
            return;
        };
        self.open_and_play(&path);
    }

    fn open_and_play(&self, path: &str) {
        let file = match File::open(path) {
            Ok(f) => f,
            Err(e) => {
                eprintln!("crescendo: cannot open {path}: {e}");
                return;
            }
        };
        let reader = BufReader::new(file);
        let decoder: Decoder<BufReader<File>> = match Decoder::new(reader) {
            Ok(d) => d,
            Err(e) => {
                eprintln!("crescendo: cannot decode {path}: {e}");
                return;
            }
        };
        let channels = decoder.channels().get();
        let (eq_settings, eq_ver) = self.eq.snapshot();
        let eq_channels = (0..channels)
            .map(|_| {
                eq::EqChannel::new(
                    decoder.sample_rate().get() as f64,
                    &eq_settings.gains,
                    eq_settings.preamp_db,
                )
            })
            .collect::<Vec<_>>()
            .into_iter()
            .filter(|_| eq_settings.enabled)
            .collect::<Vec<_>>();
        let tap = TapSource {
            inner: decoder,
            prod: self.prod.clone(),
            eq: self.eq.clone(),
            eq_channels,
            eq_ver,
            sample_count: 0,
            channels,
            ch_idx: 0,
            frame_acc: 0.0,
        };

        self.state.lock().status = PlayStatus::Playing;
        // Clear stale spectrum data so the orb doesn't show the old track.
        let _ = self.prod.lock().push_slice(&vec![0.0; FFT_SIZE]);
        self.player.clear();
        self.player.set_volume(self.state.lock().volume);
        self.player.append(tap);
        self.player.play();
    }

    /// Advance to next track (auto or manual). Auto honors repeat-one.
    pub fn advance(&self, auto: bool) {
        let repeat_one = auto && self.state.lock().repeat == 2;
        if repeat_one {
            if let Some(p) = self.current_path() {
                self.open_and_play(&p);
            }
            return;
        }

        let next = {
            let st = self.state.lock();
            let len = st.queue.len() as isize;
            let mut n = st.index + 1;
            if n >= len {
                if st.repeat >= 1 {
                    n = 0;
                } else {
                    n = -1;
                }
            }
            n
        };
        if next < 0 {
            self.stop();
            return;
        }
        self.state.lock().index = next;
        self.load_current();
    }

    pub fn previous(&self) {
        if self.position() > 3.0 {
            self.seek(0.0);
            return;
        }
        {
            let mut st = self.state.lock();
            let len = st.queue.len() as isize;
            let mut p = st.index - 1;
            if p < 0 {
                p = if st.repeat >= 1 { len - 1 } else { 0 };
            }
            st.index = p;
        }
        if let Some(path) = self.current_path() {
            self.open_and_play(&path);
        }
    }

    // ---- transport ----

    pub fn pause(&self) {
        {
            let mut st = self.state.lock();
            if st.status == PlayStatus::Playing {
                st.status = PlayStatus::Paused;
            }
        }
        self.player.pause();
    }

    pub fn resume(&self) {
        {
            let mut st = self.state.lock();
            if st.status == PlayStatus::Paused {
                st.status = PlayStatus::Playing;
            }
        }
        self.player.play();
    }

    pub fn stop(&self) {
        self.state.lock().status = PlayStatus::Stopped;
        self.player.stop();
    }

    pub fn toggle(&self) {
        let status = self.state.lock().status;
        match status {
            PlayStatus::Playing => self.pause(),
            PlayStatus::Paused => self.resume(),
            PlayStatus::Stopped => {}
        }
    }

    pub fn seek(&self, sec: f64) {
        let _ = self.player.try_seek(Duration::from_secs_f64(sec.max(0.0)));
    }

    pub fn set_volume(&self, v: f32) {
        let vol = {
            let mut st = self.state.lock();
            st.volume = v.clamp(0.0, 1.0);
            st.volume
        };
        self.player.set_volume(vol);
    }

    pub fn position(&self) -> f64 {
        self.player.get_pos().as_secs_f64()
    }

    pub fn status(&self) -> PlayStatus {
        self.state.lock().status
    }

    pub fn queue_len(&self) -> usize {
        self.state.lock().queue.len()
    }

    pub fn current_index(&self) -> isize {
        self.state.lock().index
    }
}

// ---------------------------------------------------------------- FFT

fn fft_worker(mut cons: HeapCons<f32>, run: Arc<AtomicBool>, emit: impl Fn(SpectrumPayload)) {
    let mut planner = FftPlanner::<f32>::new();
    let fft = planner.plan_fft_forward(FFT_SIZE);

    let window: Vec<f32> = (0..FFT_SIZE)
        .map(|n| 0.5 * (1.0 - (2.0 * std::f32::consts::PI * n as f32 / FFT_SIZE as f32).cos()))
        .collect();

    let mut history: Vec<f32> = vec![0.0; FFT_SIZE];
    let mut scratch = vec![Complex::new(0.0, 0.0); FFT_SIZE];
    let mut smooth = vec![0.0f32; BANDS];
    let mut wave = vec![0.0f32; WAVEFORM];
    let mut chunk = [0.0f32; 2048];

    // Precompute log-spaced band edges over FFT bins (up to ~72% of Nyquist).
    let nyq_bins = FFT_SIZE / 2;
    let mut edges = [0usize; BANDS + 1];
    for i in 0..=BANDS {
        let frac = (i as f32 / BANDS as f32).powf(2.2);
        edges[i] = ((frac * (nyq_bins as f32 * 0.72)) as usize).clamp(0, nyq_bins - 1);
        if i > 0 && edges[i] <= edges[i - 1] {
            edges[i] = edges[i - 1] + 1;
        }
    }

    while run.load(Ordering::Relaxed) {
        std::thread::sleep(Duration::from_millis(16));
        let mut got = 0usize;
        let n = cons.pop_slice(&mut chunk);
        if n > 0 {
            if n >= FFT_SIZE {
                history.copy_from_slice(&chunk[n - FFT_SIZE..]);
            } else {
                history.rotate_left(n);
                history[FFT_SIZE - n..].copy_from_slice(&chunk[..n]);
            }
            got = n;
        }
        if got == 0 {
            for s in smooth.iter_mut() {
                *s *= 0.9;
            }
            continue;
        }

        // window into scratch
        for (i, s) in scratch.iter_mut().enumerate() {
            s.re = history[i] * window[i];
            s.im = 0.0;
        }
        fft.process(&mut scratch);

        // band magnitudes
        for (b, s) in smooth.iter_mut().enumerate() {
            let lo = edges[b];
            let hi = edges[b + 1].min(lo + 96);
            let mut peak = 0.0f32;
            for c in &scratch[lo..hi.max(lo + 1)] {
                let m = (c.re * c.re + c.im * c.im).sqrt() / (FFT_SIZE as f32 * 0.5);
                if m > peak {
                    peak = m;
                }
            }
            let level = (peak * 3.2).clamp(0.0, 1.0).sqrt();
            *s += (level - *s) * (if level > *s { 0.55 } else { 0.18 });
        }

        // waveform: latest WAVEFORM samples, normalized
        let tail = &history[FFT_SIZE - WAVEFORM..];
        let mut maxv = 0.01f32;
        for v in tail {
            maxv = maxv.max(v.abs());
        }
        for (w, v) in wave.iter_mut().zip(tail) {
            *w = v / maxv;
        }

        let bass: f32 = smooth[..7].iter().sum::<f32>() / 7.0;
        let mid: f32 = smooth[7..28].iter().sum::<f32>() / 21.0;
        let treble: f32 = smooth[28..].iter().sum::<f32>() / (BANDS - 28) as f32;
        let energy = bass * 0.55 + mid * 0.3 + treble * 0.15;

        emit(SpectrumPayload {
            bands: smooth.clone(),
            waveform: wave.clone(),
            bass,
            mid,
            treble,
            energy,
        });
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Run the same banding math as fft_worker over a synthetic sine.
    fn bands_for_freq(freq: f32) -> Vec<f32> {
        let n = FFT_SIZE;
        let window: Vec<f32> = (0..n)
            .map(|i| 0.5 * (1.0 - (2.0 * std::f32::consts::PI * i as f32 / n as f32).cos()))
            .collect();
        let mut planner = FftPlanner::<f32>::new();
        let fft = planner.plan_fft_forward(n);
        let mut scratch: Vec<Complex<f32>> = (0..n)
            .map(|i| {
                Complex::new(
                    (2.0 * std::f32::consts::PI * freq * i as f32 / 44100.0).sin() * window[i],
                    0.0,
                )
            })
            .collect();
        fft.process(&mut scratch);

        let nyq_bins = n / 2;
        let mut edges = [0usize; BANDS + 1];
        for i in 0..=BANDS {
            let frac = (i as f32 / BANDS as f32).powf(2.2);
            edges[i] = ((frac * (nyq_bins as f32 * 0.72)) as usize).clamp(0, nyq_bins - 1);
            if i > 0 && edges[i] <= edges[i - 1] {
                edges[i] = edges[i - 1] + 1;
            }
        }
        let mut out = vec![0.0f32; BANDS];
        for (b, o) in out.iter_mut().enumerate() {
            let lo = edges[b];
            let hi = edges[b + 1].min(lo + 96);
            let mut peak = 0.0f32;
            for c in &scratch[lo..hi.max(lo + 1)] {
                let m = (c.re * c.re + c.im * c.im).sqrt() / (n as f32 * 0.5);
                if m > peak {
                    peak = m;
                }
            }
            *o = (peak * 3.2).clamp(0.0, 1.0).sqrt();
        }
        out
    }

    #[test]
    fn bass_tone_peaks_in_low_bands() {
        let b = bands_for_freq(60.0);
        let low: f32 = b[..8].iter().sum();
        let high: f32 = b[32..].iter().sum();
        assert!(low > high * 4.0, "low {low} high {high}");
        // 60 Hz @ 44.1k lands around bin 5–6 of 2048 (bands are log-spaced),
        // so the peak must appear in the first quarter, not literally bin 0.
        let peak_band = b.iter().enumerate().max_by(|x, y| x.1.total_cmp(y.1)).unwrap().0;
        assert!(peak_band < 16, "peak at band {peak_band}");
    }

    #[test]
    fn treble_tone_peaks_in_high_bands() {
        let b = bands_for_freq(6000.0);
        let low: f32 = b[..12].iter().sum();
        let high: f32 = b[40..].iter().sum();
        assert!(high > low * 4.0, "low {low} high {high}");
    }

    #[test]
    fn payload_invariants() {
        let p = SpectrumPayload {
            bands: vec![0.5; BANDS],
            waveform: vec![0.0; WAVEFORM],
            bass: 0.1,
            mid: 0.2,
            treble: 0.3,
            energy: 0.2,
        };
        assert_eq!(p.bands.len(), BANDS);
        assert_eq!(p.waveform.len(), WAVEFORM);
        assert!((p.energy - 0.2).abs() < 1e-6);
    }
}

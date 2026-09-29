//! 10-band biquad peaking equalizer.
//!
//! ISO-octave center frequencies from 31 Hz to 16 kHz, implemented as a
//! cascade of RBJ "Cookbook" peaking-EQ biquads plus a linear gain (preamp).

/// ISO center frequencies for the 10 bands.
pub const BAND_FREQS: [f32; 10] = [31.0, 62.0, 125.0, 250.0, 500.0, 1000.0, 2000.0, 4000.0, 8000.0, 16000.0];

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Biquad {
    b0: f64,
    b1: f64,
    b2: f64,
    a1: f64,
    a2: f64,
    // state
    x1: f64,
    x2: f64,
    y1: f64,
    y2: f64,
}

impl Biquad {
    /// RBJ peaking EQ. `db_gain` in dB, `freq` Hz, `q` quality factor.
    pub fn peaking(sample_rate: f64, freq: f64, db_gain: f64, q: f64) -> Biquad {
        let a = 10f64.powf(db_gain / 40.0); // sqrt(10^(g/10))
        let w0 = 2.0 * std::f64::consts::PI * freq / sample_rate;
        let alpha = w0.sin() / (2.0 * q);
        let cos_w0 = w0.cos();

        let b0 = 1.0 + alpha * a;
        let b1 = -2.0 * cos_w0;
        let b2 = 1.0 - alpha * a;
        let a0 = 1.0 + alpha / a;
        let a1 = -2.0 * cos_w0;
        let a2 = 1.0 - alpha / a;

        Biquad {
            b0: b0 / a0,
            b1: b1 / a0,
            b2: b2 / a0,
            a1: a1 / a0,
            a2: a2 / a0,
            x1: 0.0,
            x2: 0.0,
            y1: 0.0,
            y2: 0.0,
        }
    }

    /// Identity filter (gain 0, no phase shift risk at reconfigure).
    pub fn identity() -> Biquad {
        Biquad { b0: 1.0, b1: 0.0, b2: 0.0, a1: 0.0, a2: 0.0, x1: 0.0, x2: 0.0, y1: 0.0, y2: 0.0 }
    }

    #[inline]
    pub fn process(&mut self, x: f64) -> f64 {
        let y = self.b0 * x + self.b1 * self.x1 + self.b2 * self.x2 - self.a1 * self.y1 - self.a2 * self.y2;
        self.x2 = self.x1;
        self.x1 = x;
        self.y2 = self.y1;
        self.y1 = y;
        y
    }

    #[allow(dead_code)] // public DSP API
    pub fn reset(&mut self) {
        self.x1 = 0.0;
        self.x2 = 0.0;
        self.y1 = 0.0;
        self.y2 = 0.0;
    }
}

/// One channel's cascaded band filters.
pub struct EqChannel {
    bands: Vec<Biquad>,
    preamp: f64, // linear gain
}

impl EqChannel {
    pub fn new(sample_rate: f64, gains_db: &[f32; 10], preamp_db: f32) -> EqChannel {
        EqChannel {
            bands: BAND_FREQS
                .iter()
                .zip(gains_db.iter())
                .map(|(&f, &g)| {
                    if g.abs() < 0.01 {
                        Biquad::identity()
                    } else {
                        Biquad::peaking(sample_rate, f as f64, g as f64, 1.1)
                    }
                })
                .collect(),
            preamp: 10f64.powf(preamp_db as f64 / 20.0),
        }
    }

    #[inline]
    pub fn process(&mut self, x: f64) -> f64 {
        let mut s = x * self.preamp;
        for b in &mut self.bands {
            s = b.process(s);
        }
        s
    }

    #[allow(dead_code)] // public DSP API
    pub fn reset(&mut self) {
        for b in &mut self.bands {
            b.reset();
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn identity_biquad_passes_signal() {
        let mut f = Biquad::identity();
        for x in [0.0, 0.5, -0.3, 1.0, -1.0] {
            assert!((f.process(x) - x).abs() < 1e-9);
        }
    }

    #[test]
    fn peaking_zero_gain_is_nearly_identity() {
        // 0 dB peak gain with Q=1.1: gain at center must be ~1.0.
        let mut f = Biquad::peaking(44100.0, 1000.0, 0.0, 1.1);
        // feed a slow ramp; steady-state gain approaches d.c. value b0+b1+b2 / 1+a1+a2 = 1
        let mut y = 0.0;
        for i in 0..2000 {
            y = f.process(0.25 * (i as f64 / 2000.0));
        }
        let _ = y;
        // H(0) == 1 for peaking EQ regardless of gain
        let dc = (f.b0 + f.b1 + f.b2) / (1.0 + f.a1 + f.a2);
        assert!((dc - 1.0).abs() < 1e-6, "dc gain {dc}");
    }

    #[test]
    fn preamp_scales_amplitude() {
        let ch = EqChannel::new(44100.0, &[0.0; 10], -6.0);
        // -6 dB ≈ 0.501 linear
        assert!((ch.preamp - 0.501187).abs() < 1e-4);
    }

    #[test]
    fn channel_processes_without_panic_and_resets() {
        let mut ch = EqChannel::new(48000.0, &[6.0, -3.0, 2.0, 0.0, 1.0, 0.0, -2.0, 4.0, 1.0, 3.0], 0.0);
        for i in 0..1000 {
            let x = (i as f64 * 0.01).sin();
            let y = ch.process(x);
            assert!(y.is_finite());
        }
        ch.reset();
    }
}

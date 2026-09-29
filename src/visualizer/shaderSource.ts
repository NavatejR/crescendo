export const VERT = `#version 300 es
precision highp float;
const vec2 verts[3] = vec2[3](vec2(-1.0, -1.0), vec2(3.0, -1.0), vec2(-1.0, 3.0));
out vec2 vUv;
void main() {
  vec2 p = verts[gl_VertexID];
  vUv = p * 0.5 + 0.5;
  gl_Position = vec4(p, 0.0, 1.0);
}`;

const COMMON = `
uniform vec2  uRes;
uniform float uTime;
uniform float uBass;
uniform float uMid;
uniform float uTreble;
uniform float uEnergy;
uniform float uIntensity;
uniform float uActive;
uniform vec3  uColA;
uniform vec3  uColB;
uniform vec3  uColC;
uniform sampler2D uSpectrum;
uniform sampler2D uWave;

#define PI 3.14159265359

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x),
             mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + vec2(17.7); a *= 0.5; }
  return v;
}
vec3 palette(float t) {
  return uColA + uColB * cos(6.28318 * (uColC * t + vec3(0.0, 0.33, 0.67)));
}
float spec(vec2 uv, vec2 ldir) {
  float d = length(uv - ldir);
  return smoothstep(0.5, 0.0, d) * 0.22;
}
float band(float x) {
  return texture(uSpectrum, vec2(clamp(x, 0.0, 1.0), 0.5)).r;
}
float wave(float x) {
  return texture(uWave, vec2(clamp(x, 0.0, 1.0), 0.5)).r * 2.0 - 1.0;
}
`;

export const FRAG_ORBS = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
${COMMON}
void main() {
  vec2 uv = (vUv * 2.0 - 1.0) * vec2(uRes.x / uRes.y, 1.0);
  vec3 col = vec3(0.0);
  float t = uTime * (0.10 + uEnergy * 0.16);

  // 5 metaball orbs; radius and drift follow the spectrum
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    float speed = 0.35 + fi * 0.17;
    float ph = t * speed + fi * 2.1;
    vec2 c = vec2(
      sin(ph) * (0.55 + 0.35 * sin(t * 0.23 + fi)),
      cos(ph * 0.83 + fi) * 0.45
    );
    float bi = band(fi / 5.0 + uv.x * 0.06 + 0.02);
    float r = (0.16 + bi * 0.55) * (0.75 + uIntensity * 0.75);
    float d = length(uv - c);
    float orb = r / (d * d + r * r * 0.55);
    col += palette(fi / 5.0 + uTime * 0.02) * orb * 0.16 * uActive;
  }

  // reactive halo driven by bass + shimmering treble sparks
  col *= 0.85 + uBass * 1.5;
  col += vec3(0.9, 0.95, 1.0) * pow(max(uTreble, 0.0), 2.0) * 0.10 * hash(vUv * uRes + uTime);

  // dark glassy vignette
  float vig = smoothstep(1.9, 0.35, length(uv));
  col *= mix(0.35, 1.0, vig);
  fragColor = vec4(col, 1.0);
}`;

export const FRAG_AURORA = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
${COMMON}
void main() {
  vec2 uv = vUv;
  vec3 col = vec3(0.0);
  float t = uTime * (0.14 + uEnergy * 0.22);

  // layered aurora curtains bent by the waveform
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    float y = uv.y + wave(uv.x * (0.6 + fi * 0.2) + t * (0.5 + fi * 0.3)) * 0.18;
    float bandMask = band(fi / 4.0 + uv.x * 0.5);
    float curtain = exp(-abs(y - (0.35 + fi * 0.14)) * (5.0 + fi * 2.0 + bandMask * 6.0));
    col += palette(0.15 + fi * 0.22 + uv.x * 0.25 + t * 0.05) * curtain * (0.32 + bandMask * 0.5);
  }

  col *= 0.8 + uBass * 1.1;
  col += fbm(uv * 3.0 + t) * uColB * 0.05;
  float vig = smoothstep(1.6, 0.3, length(uv * vec2(uRes.x / uRes.y, 1.0)));
  col *= mix(0.3, 1.0, vig);
  fragColor = vec4(col, 1.0);
}`;

export const FRAG_RINGS = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
${COMMON}
void main() {
  vec2 uv = (vUv * 2.0 - 1.0) * vec2(uRes.x / uRes.y, 1.0);
  float r = length(uv);
  float a = atan(uv.y, uv.x);
  vec3 col = vec3(0.0);
  float t = uTime * (0.2 + uEnergy * 0.3);

  // spectrum-driven radial rings (log-ish frequency spokes)
  float bands = 48.0;
  float bi = band(pow(a / PI * 0.5 + 0.5, 1.5));
  float spokes = smoothstep(0.12, 0.0, abs(fract(a / PI * bands * 0.5) - 0.5) * 2.0 - (0.4 + bi * 0.55));
  col += palette(a / PI + t * 0.1) * spokes * (0.25 + bi * 0.9);

  // pulsing rings expanding from the center on bass hits
  float ring = abs(fract(r * 2.2 - t * (0.6 + uBass * 1.4)) - 0.5);
  col += palette(0.6 + r - t * 0.08) * smoothstep(0.5, 0.0, ring) * (0.06 + uBass * 0.3);

  float vig = smoothstep(1.8, 0.3, r);
  col *= mix(0.3, 1.0, vig);
  fragColor = vec4(col, 1.0);
}`;

export const FRAGMENTS: Record<string, string> = {
  orbs: FRAG_ORBS,
  aurora: FRAG_AURORA,
  rings: FRAG_RINGS,
};

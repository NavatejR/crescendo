import { useEffect, useRef } from "react";
import { VERT, FRAGMENTS } from "./shaderSource";
import { spectrum } from "../lib/spectrum";

function hexToNdc(hex: string): [number, number, number] {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!m) return [0.5, 0.7, 1.0];
  return [parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255];
}

function compile(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader | null {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.error("Shader compile error:", gl.getShaderInfoLog(sh));
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

interface Props {
  style: "orbs" | "aurora" | "rings";
  intensity: number;
  className?: string;
}

/**
 * WebGL2 full-viewport fragment-shader visualizer.
 * Data comes from the shared spectrum singleton — fed by native FFT
 * events inside the Tauri app, or the browser simulator in preview mode.
 */
export default function SpectrumCanvas({ style, intensity, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl2", { antialias: false, alpha: false });
    if (!gl) {
      console.warn("WebGL2 unavailable — visualizer disabled");
      return;
    }

    // ---- program ----
    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENTS[style] ?? FRAGMENTS.orbs);
    if (!vs || !fs) return;
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error("Program link error:", gl.getProgramInfoLog(prog));
      return;
    }
    gl.useProgram(prog);

    const U = (n: string) => gl.getUniformLocation(prog, n);
    const uRes = U("uRes");
    const uTime = U("uTime");
    const uBass = U("uBass");
    const uMid = U("uMid");
    const uTreble = U("uTreble");
    const uEnergy = U("uEnergy");
    const uIntensity = U("uIntensity");
    const uActive = U("uActive");
    const uColA = U("uColA");
    const uColB = U("uColB");
    const uColC = U("uColC");
    const uSpec = U("uSpectrum");
    const uWaveU = U("uWave");

    // ---- data textures ----
    const SPEC_N = 64;
    const specData = new Uint8Array(SPEC_N * 4);
    const waveData = new Uint8Array(256 * 4);
    const specTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, specTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, SPEC_N, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, specData);
    const waveTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, waveTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, waveData);
    for (const _t of [specTex, waveTex]) {
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }

    // ---- theme palette ----
    const css = getComputedStyle(document.documentElement);
    const accent = hexToNdc(css.getPropertyValue("--accent") || "#7cc4ff");
    const text = hexToNdc(css.getPropertyValue("--text") || "#f2f2f7");
    const cA = [accent[0] * 0.5, accent[1] * 0.5, accent[2] * 0.5];
    const cB = [accent[0] * 0.5, accent[1] * 0.5, accent[2] * 0.5];
    const cC = [1.0, text[0] * 0.9, text[1] * 0.8];

    gl.uniform1i(uSpec, 0);
    gl.uniform1i(uWaveU, 1);
    gl.uniform3f(uColA, cA[0], cA[1], cA[2]);
    gl.uniform3f(uColB, cB[0], cB[1], cB[2]);
    gl.uniform3f(uColC, cC[0], cC[1], cC[2]);

    // ---- resize ----
    function resize() {
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.floor(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.floor(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl!.viewport(0, 0, w, h);
      }
    }
    resize();

    let raf = 0;
    const loop = (now: number) => {
      resize();

      // upload spectrum bands
      gl.bindTexture(gl.TEXTURE_2D, specTex);
      for (let i = 0; i < SPEC_N; i++) {
        const v = Math.min(255, Math.round(spectrum.bands[i] * 255));
        specData[i * 4] = v;
        specData[i * 4 + 1] = v;
        specData[i * 4 + 2] = v;
        specData[i * 4 + 3] = 255;
      }
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, SPEC_N, 1, gl.RGBA, gl.UNSIGNED_BYTE, specData);

      // upload waveform
      gl.bindTexture(gl.TEXTURE_2D, waveTex);
      for (let i = 0; i < 256; i++) {
        const v = Math.max(0, Math.min(255, Math.round((spectrum.waveform[i] * 0.5 + 0.5) * 255)));
        waveData[i * 4] = v;
        waveData[i * 4 + 1] = v;
        waveData[i * 4 + 2] = v;
        waveData[i * 4 + 3] = 255;
      }
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 256, 1, gl.RGBA, gl.UNSIGNED_BYTE, waveData);

      const active = spectrum.playing ? 1.0 : 0.25;
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, now / 1000);
      gl.uniform1f(uBass, spectrum.bass);
      gl.uniform1f(uMid, spectrum.mid);
      gl.uniform1f(uTreble, spectrum.treble);
      gl.uniform1f(uEnergy, spectrum.energy);
      gl.uniform1f(uIntensity, intensity);
      gl.uniform1f(uActive, active);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const onLost = (e: Event) => e.preventDefault();
    canvas.addEventListener("webglcontextlost", onLost);

    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("webglcontextlost", onLost);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [style, intensity]);

  return <canvas ref={canvasRef} className={className ?? "viz-canvas"} />;
}

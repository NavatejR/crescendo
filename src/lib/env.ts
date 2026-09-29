/** True when running inside a Tauri webview. */
export const isNative = (): boolean =>
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

import React from "react";
import ReactDOM from "react-dom/client";
import { applyTheme, useTheme } from "./theme/store";
import "./styles/index.css";
import App from "./App";

// Apply persisted theme before first paint to avoid a flash of default theme.
const t = useTheme.getState();
applyTheme(t.skin, t.overhaul, t.accent);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

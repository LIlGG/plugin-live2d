import React from "react";
import ReactDOM from "react-dom/client";
import "./components/Live2dContext";
import "./components/Live2dDevTools";
import { MODEL_READY_EVENT_NAME } from "./events/model-ready";

const rootEl = document.getElementById("root");
if (rootEl) {
  const root = ReactDOM.createRoot(rootEl);
  root.render(
    <React.StrictMode>
      {React.createElement("live2d-context")}
    </React.StrictMode>,
  );
}

// Initialize DevTools in dev mode
if (import.meta.env.DEV) {
  window.addEventListener(MODEL_READY_EVENT_NAME, (e) => {
    const model = (e as CustomEvent).detail.model;
    const controller = model.getController();

    // Find or create devtools element
    let devtools = document.querySelector("live2d-dev-tools") as
      | HTMLElement
      | null;
    if (!devtools) {
      devtools = document.createElement("live2d-dev-tools");
      document.body.appendChild(devtools);
    }
    (devtools as HTMLElement & { setController?: (c: unknown) => void })
      .setController?.(controller);
  });
}

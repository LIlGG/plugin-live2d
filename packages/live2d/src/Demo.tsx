import React from "react";
import ReactDOM from "react-dom/client";
import "./components/Live2dContext";

const rootEl = document.getElementById("root");
if (rootEl) {
  const root = ReactDOM.createRoot(rootEl);
  root.render(
    <React.StrictMode>
      {React.createElement("live2d-context")}
    </React.StrictMode>,
  );
}

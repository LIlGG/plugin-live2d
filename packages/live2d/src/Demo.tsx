import React from "react";
import ReactDOM from "react-dom/client";
import { Live2dContextComponent } from "./components/Live2dContext";

const rootEl = document.getElementById("root");
if (rootEl) {
	const root = ReactDOM.createRoot(rootEl);
	root.render(
		<React.StrictMode>
			<Live2dContextComponent />
		</React.StrictMode>,
	);
}

import { Live2dContext } from "./components/Live2dContext";
import { Live2dToggle } from "./components/Live2dToggle";
import { Live2dWidget } from "./components/Live2dWidget";
import { Live2dRuntime, createLive2d } from "./live2d/runtime";

export { Live2dToggle, Live2dWidget, Live2dContext };
export { createLive2d, Live2dRuntime };

const live2d = createLive2d();

if (typeof window !== "undefined" && !window.live2d) {
  window.live2d = live2d;
}

export default live2d;

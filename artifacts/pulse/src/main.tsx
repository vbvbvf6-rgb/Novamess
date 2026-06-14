import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const _savedFs = localStorage.getItem("pulse-font-size");
const _fsMap: Record<string, string> = { small: "13px", medium: "15px", large: "17px" };
if (_savedFs && _fsMap[_savedFs]) document.documentElement.style.fontSize = _fsMap[_savedFs];

function updateAppHeight() {
  const h = (window.visualViewport ? window.visualViewport.height : window.innerHeight);
  document.documentElement.style.setProperty("--app-h", h + "px");
}
updateAppHeight();
window.addEventListener("resize", updateAppHeight);
if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", updateAppHeight);
}
window.addEventListener("orientationchange", () => setTimeout(updateAppHeight, 300));

// Lock to portrait on mobile devices
if (screen.orientation && typeof (screen.orientation as any).lock === "function") {
  const tryLock = () => {
    (screen.orientation as any).lock("portrait").catch(() => {});
  };
  document.addEventListener("fullscreenchange", tryLock);
  tryLock();
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

createRoot(document.getElementById("root")!).render(<App />);

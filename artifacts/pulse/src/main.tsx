import { createRoot } from "react-dom/client";
import { setBaseUrl } from "@workspace/api-client-react";
import App from "./App";
import { setupNativeNotifications } from "./lib/nativeNotifications";
import { queryClient, QUERY_KEYS } from "./lib/queryClient";
import "./index.css";

setupNativeNotifications();

// When deployed on Vercel (frontend-only), VITE_API_URL points to the backend server.
// In local dev or single-server deploys this is empty and relative URLs are used.
const _API_BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/+$/, "");
setBaseUrl(_API_BASE || null);

// Patch global fetch so every raw fetch("/api/…") call is also redirected
// to the remote backend when VITE_API_URL is set.
if (_API_BASE) {
  const _origFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    if (typeof input === "string" && input.startsWith("/api")) {
      input = `${_API_BASE}${input}`;
    }
    return _origFetch(input, init);
  };
}

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

// Allow all orientations — landscape is fully supported

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

// Seed React Query cache from the early prefetch (fired in index.html before JS loaded).
// This races the prefetch against React Query's own requests — whichever finishes first wins.
// On warm server: data appears before React even fires its own requests.
// On cold server: skeleton shows immediately, data updates as soon as server responds.
const _pf = (window as any).__prefetch as Record<string, Promise<unknown>> | undefined;
if (_pf) {
  const entries: [string[], Promise<unknown>][] = [
    [QUERY_KEYS.me,       _pf.me],
    [QUERY_KEYS.chats,    _pf.chats],
    [QUERY_KEYS.contacts, _pf.contacts],
    [QUERY_KEYS.posts,    _pf.posts],
    [QUERY_KEYS.stories,  _pf.stories],
  ];
  entries.forEach(([key, p]) => {
    p.then((data) => {
      if (data && !queryClient.getQueryData(key)) {
        queryClient.setQueryData(key, data);
      }
    }).catch(() => {});
  });
}

createRoot(document.getElementById("root")!).render(<App />);

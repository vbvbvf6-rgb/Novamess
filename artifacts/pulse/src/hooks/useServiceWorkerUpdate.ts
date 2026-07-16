import { useEffect, useState, useRef } from "react";

const CHECK_INTERVAL_MS = 30 * 60 * 1000;
const FORCE_RELOAD_POLL_MS = 60 * 1000; // check admin flag every 60s
const JUST_UPDATED_KEY = "aura-just-updated";
const JUST_UPDATED_TTL_MS = 10_000;

function wasJustUpdated(): boolean {
  const ts = Number(sessionStorage.getItem(JUST_UPDATED_KEY) ?? "0");
  return ts > 0 && Date.now() - ts < JUST_UPDATED_TTL_MS;
}

export function useServiceWorkerUpdate() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [swUpdateReady, setSwUpdateReady] = useState(false);
  const [adminReleasedUpdate, setAdminReleasedUpdate] = useState(false);
  const appliedRef = useRef(false);

  // SW tracking — same as before but doesn't immediately surface to UI
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (wasJustUpdated()) {
      sessionStorage.removeItem(JUST_UPDATED_KEY);
      return;
    }

    let reg: ServiceWorkerRegistration | null = null;

    const markWaiting = (sw: ServiceWorker) => {
      if (appliedRef.current) return;
      setWaitingWorker(sw);
      setSwUpdateReady(true);
    };

    const watchInstalling = (installing: ServiceWorker) => {
      installing.addEventListener("statechange", () => {
        if (appliedRef.current) return;
        if (installing.state === "installed" && navigator.serviceWorker.controller) {
          markWaiting(installing);
        }
      });
    };

    navigator.serviceWorker.getRegistration().then((r) => {
      if (!r) return;
      reg = r;
      if (r.waiting && navigator.serviceWorker.controller) markWaiting(r.waiting);
      if (r.installing) watchInstalling(r.installing);
      r.addEventListener("updatefound", () => {
        if (r.installing) watchInstalling(r.installing);
      });
    });

    const interval = setInterval(() => { reg?.update().catch(() => {}); }, CHECK_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible" && !appliedRef.current) reg?.update().catch(() => {});
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  // Poll admin force-reload flag
  useEffect(() => {
    const checkForceReload = async () => {
      try {
        const r = await fetch("/api/app/update-required");
        if (!r.ok) return;
        const data = await r.json();
        if (data.required === true) setAdminReleasedUpdate(true);
        else setAdminReleasedUpdate(false);
      } catch {}
    };

    checkForceReload();
    const interval = setInterval(checkForceReload, FORCE_RELOAD_POLL_MS);

    // Also listen for SSE broadcast "force-reload" event
    const handler = (e: CustomEvent<any>) => {
      if (e.detail?.required === true) setAdminReleasedUpdate(true);
      else setAdminReleasedUpdate(false);
    };
    window.addEventListener("sse:force-reload" as any, handler);

    return () => {
      clearInterval(interval);
      window.removeEventListener("sse:force-reload" as any, handler);
    };
  }, []);

  // Show update banner only when admin has released the update
  // If admin released it, show even without SW waiting (user will just reload and get fresh content)
  const updateAvailable = adminReleasedUpdate;

  const applyUpdate = () => {
    appliedRef.current = true;
    setAdminReleasedUpdate(false);
    sessionStorage.setItem(JUST_UPDATED_KEY, String(Date.now()));

    const doReload = () => window.location.reload();

    if (waitingWorker) {
      const onControllerChange = () => {
        navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
        doReload();
      };
      navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
      waitingWorker.postMessage({ type: "skip-waiting" });
      setTimeout(() => {
        navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
        doReload();
      }, 2000);
    } else {
      // No new SW waiting — just reload to get fresh content from network
      doReload();
    }
  };

  return { updateAvailable, applyUpdate, swUpdateReady };
}

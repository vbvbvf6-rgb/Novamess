import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X, Smartphone, Monitor } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem("pulse-pwa-dismissed");
    if (dismissed && Date.now() - Number(dismissed) < 7 * 24 * 60 * 60 * 1000) return;

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as any).standalone === true;
    if (isStandalone) { setIsInstalled(true); return; }

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as any).MSStream;
    if (ios) {
      const safari = /safari/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);
      if (safari) { setIsIos(true); setTimeout(() => setShow(true), 3000); }
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setShow(true), 3000);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") setIsInstalled(true);
    setShow(false);
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem("pulse-pwa-dismissed", String(Date.now()));
  };

  if (isInstalled || (!deferredPrompt && !isIos)) return null;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 80, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 80, scale: 0.95 }}
          transition={{ type: "spring", damping: 22, stiffness: 300 }}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] w-[calc(100%-32px)] max-w-sm"
        >
          <div className="bg-card border border-border rounded-2xl shadow-2xl p-4 backdrop-blur-md">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                {isIos ? <Smartphone size={22} className="text-primary" /> : <Monitor size={22} className="text-primary" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-foreground">Установить Nova</p>
                {isIos ? (
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    Нажмите <span className="font-semibold text-primary">«Поделиться»</span> → <span className="font-semibold text-primary">«На экран Домой»</span> чтобы установить приложение
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    Установите Nova как приложение — работает как нативное
                  </p>
                )}
              </div>
              <button
                onClick={handleDismiss}
                className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors shrink-0"
              >
                <X size={15} />
              </button>
            </div>
            {!isIos && (
              <button
                onClick={handleInstall}
                className="mt-3 w-full py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
              >
                <Download size={15} />
                Установить приложение
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

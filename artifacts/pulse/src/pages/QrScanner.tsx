import { useEffect, useRef, useState } from "react";
import { BrowserQRCodeReader } from "@zxing/browser";
import { ArrowLeft, Camera, CameraOff, LoaderCircle, ScanLine, ShieldCheck } from "lucide-react";
import { useLocation } from "wouter";

function getLoginPath(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.origin !== window.location.origin) return null;
    const match = url.pathname.match(/^\/qr\/([A-Za-z0-9_-]+)\/?$/);
    return match ? `/qr/${match[1]}` : null;
  } catch {
    return null;
  }
}

export default function QrScanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const scannedRef = useRef(false);
  const [, navigate] = useLocation();
  const [cameraError, setCameraError] = useState("");
  const [cameraReady, setCameraReady] = useState(false);
  const [invalidCode, setInvalidCode] = useState(false);

  useEffect(() => {
    let active = true;
    const reader = new BrowserQRCodeReader();

    void reader.decodeFromConstraints(
      { audio: false, video: { facingMode: { ideal: "environment" } } },
      videoRef.current!,
      (result, _error, controls) => {
        controlsRef.current = controls;
        if (!active || !result || scannedRef.current) return;

        const loginPath = getLoginPath(result.getText());
        if (!loginPath) {
          setInvalidCode(true);
          return;
        }

        scannedRef.current = true;
        controls.stop();
        navigate(loginPath);
      },
    ).then((controls) => {
      controlsRef.current = controls;
      if (active) setCameraReady(true);
      else controls.stop();
    }).catch((error: unknown) => {
      if (!active) return;
      const message = error instanceof Error ? error.message : "";
      setCameraError(
        /permission|denied|notallowed/i.test(message)
          ? "Разрешите доступ к камере в настройках браузера или приложения."
          : "Не удалось запустить камеру. Проверьте разрешение и попробуйте ещё раз.",
      );
    });

    return () => {
      active = false;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [navigate]);

  return (
    <main className="min-h-[100dvh] bg-background px-4 py-6">
      <div className="mx-auto w-full max-w-lg">
        <button
          type="button"
          onClick={() => navigate("/settings")}
          className="mb-6 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-muted-foreground transition hover:bg-secondary hover:text-foreground"
        >
          <ArrowLeft size={17} />
          Настройки
        </button>

        <section className="overflow-hidden rounded-[28px] border border-border bg-card shadow-2xl">
          <div className="border-b border-border bg-gradient-to-br from-primary/15 via-background to-background px-6 py-7 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
              <ScanLine size={27} />
            </div>
            <h1 className="text-2xl font-black text-foreground">Сканировать QR-код</h1>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Наведите камеру на QR-код входа Nova на другом устройстве. Код откроется здесь, без отдельного приложения.
            </p>
          </div>

          <div className="p-4 sm:p-6">
            <div className="relative aspect-square overflow-hidden rounded-2xl border border-border bg-black">
              <video
                ref={videoRef}
                className="h-full w-full object-cover"
                muted
                playsInline
                aria-label="Изображение с камеры для сканирования QR-кода"
              />
              {!cameraError && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="relative aspect-square w-[68%] rounded-3xl border-2 border-white/90 shadow-[0_0_0_999px_rgba(0,0,0,0.38)]">
                    <span className="absolute -left-0.5 -top-0.5 h-7 w-7 rounded-tl-2xl border-l-4 border-t-4 border-primary" />
                    <span className="absolute -right-0.5 -top-0.5 h-7 w-7 rounded-tr-2xl border-r-4 border-t-4 border-primary" />
                    <span className="absolute -bottom-0.5 -left-0.5 h-7 w-7 rounded-bl-2xl border-b-4 border-l-4 border-primary" />
                    <span className="absolute -bottom-0.5 -right-0.5 h-7 w-7 rounded-br-2xl border-b-4 border-r-4 border-primary" />
                  </div>
                </div>
              )}
              {!cameraReady && !cameraError && (
                <div className="absolute inset-x-0 bottom-5 flex items-center justify-center gap-2 text-sm font-semibold text-white">
                  <LoaderCircle size={16} className="animate-spin" />
                  Включаем камеру…
                </div>
              )}
              {cameraError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-8 text-center text-white">
                  <CameraOff size={34} className="text-white/80" />
                  <p className="text-sm leading-relaxed">{cameraError}</p>
                </div>
              )}
            </div>

            <div className="mt-4 flex items-start gap-3 rounded-2xl border border-green-500/15 bg-green-500/5 p-4">
              <ShieldCheck size={18} className="mt-0.5 shrink-0 text-green-500" />
              <p className="text-xs leading-relaxed text-muted-foreground">
                Для безопасности камера принимает только QR-коды входа Nova. После сканирования вы увидите подтверждение перед входом.
              </p>
            </div>
            {invalidCode && (
              <p role="status" className="mt-3 text-center text-sm font-medium text-amber-500">
                Это не QR-код входа Nova. Наведите камеру на код со страницы входа в мессенджер.
              </p>
            )}
            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Camera size={14} />
              <span>Держите QR-код внутри рамки</span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

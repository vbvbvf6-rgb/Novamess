import React, { useEffect, useRef, useState } from "react";
import { Pause, Play, X, Volume2 } from "lucide-react";

type MediaState = { url: string; type: "audio" | "video"; title?: string };

export function MediaMiniPlayer() {
  const [media, setMedia] = useState<MediaState | null>(null);
  const [playing, setPlaying] = useState(true);
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const handle = (event: Event) => {
      const next = (event as CustomEvent<MediaState>).detail;
      if (!next?.url) return;
      setMedia(next);
      setPlaying(true);
    };
    window.addEventListener("pulse:play-media", handle);
    return () => window.removeEventListener("pulse:play-media", handle);
  }, []);

  useEffect(() => {
    const element = media?.type === "video" ? videoRef.current : audioRef.current;
    if (element) {
      element.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    }
  }, [media]);

  if (!media) return null;
  const toggle = () => {
    const element = media.type === "video" ? videoRef.current : audioRef.current;
    if (!element) return;
    if (element.paused) { element.play().catch(() => {}); setPlaying(true); }
    else { element.pause(); setPlaying(false); }
  };

  return (
    <aside className="fixed z-[95] bottom-4 left-4 md:left-auto md:right-4 w-[min(360px,calc(100vw-2rem))] rounded-2xl border border-border bg-card/95 backdrop-blur-xl shadow-2xl overflow-hidden" aria-label="Мини-плеер">
      <div className="flex items-center gap-2 p-2.5">
        <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0"><Volume2 size={17} /></div>
        <div className="min-w-0 flex-1"><p className="text-xs font-bold truncate">{media.title || (media.type === "video" ? "Видео" : "Аудио")}</p><p className="text-[10px] text-muted-foreground">Мини-плеер Nova</p></div>
        <button type="button" onClick={toggle} aria-label={playing ? "Пауза" : "Воспроизвести"} className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">{playing ? <Pause size={14} /> : <Play size={14} />}</button>
        <button type="button" onClick={() => setMedia(null)} aria-label="Закрыть мини-плеер" className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-secondary"><X size={15} /></button>
      </div>
      {media.type === "video" ? <video ref={videoRef} src={media.url} controls playsInline className="w-full max-h-40 bg-black" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} /> : <audio ref={audioRef} src={media.url} controls className="w-full px-2 pb-2" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} />}
    </aside>
  );
}
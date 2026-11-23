import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Maximize, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";

interface VideoPlayerProps {
  src: string;
  className?: string;
  videoClassName?: string;
  autoPlay?: boolean;
  fit?: "cover" | "contain";
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export function VideoPlayer({
  src,
  className,
  videoClassName,
  autoPlay = false,
  fit = "contain",
  onPlay,
  onPause,
  onEnded,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
    setPlaying(false);
    setCurrentTime(0);
  }, [src]);

  const togglePlayback = async () => {
    const video = videoRef.current;
    if (!video || failed) return;
    if (video.paused || video.ended) {
      if (video.ended) video.currentTime = 0;
      try {
        await video.play();
      } catch {
        setFailed(true);
      }
    } else {
      video.pause();
    }
  };

  const toggleFullscreen = async () => {
    const root = videoRef.current?.parentElement;
    if (!root) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await root.requestFullscreen?.();
    } catch {
      // Fullscreen is optional on browsers and embedded webviews.
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      void togglePlayback();
    }
  };

  return (
    <div
      className={cn("group relative overflow-hidden bg-black text-white", className)}
      onPointerDown={event => event.stopPropagation()}
      onClick={event => event.stopPropagation()}
      onKeyDown={handleKeyDown}
      data-testid="video-player"
    >
      <video
        ref={videoRef}
        src={src}
        autoPlay={autoPlay}
        playsInline
        preload="metadata"
        muted={muted}
        className={cn("block h-full w-full bg-black", fit === "cover" ? "object-cover" : "object-contain", videoClassName)}
        onPlay={() => { setPlaying(true); onPlay?.(); }}
        onPause={() => { setPlaying(false); onPause?.(); }}
        onEnded={() => { setPlaying(false); onEnded?.(); }}
        onTimeUpdate={event => setCurrentTime(event.currentTarget.currentTime)}
        onLoadedMetadata={event => setDuration(event.currentTarget.duration || 0)}
        onError={() => setFailed(true)}
        onClick={() => { void togglePlayback(); }}
        aria-label="Видеоплеер"
      />

      {!playing && !failed && (
        <button
          type="button"
          onClick={() => { void togglePlayback(); }}
          className="absolute left-1/2 top-1/2 z-10 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/50 text-white shadow-xl backdrop-blur-md transition hover:scale-105 hover:bg-black/70"
          aria-label="Воспроизвести видео"
          data-testid="button-video-play"
        >
          <Play size={23} fill="currentColor" className="ml-0.5" />
        </button>
      )}

      {failed && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 px-6 text-center text-sm text-white/80">
          Не удалось воспроизвести видео
        </div>
      )}

      {!failed && (
        <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/90 via-black/45 to-transparent px-3 pb-3 pt-10 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={Math.min(currentTime, duration || 0)}
            onChange={event => {
              const time = Number(event.target.value);
              if (videoRef.current) videoRef.current.currentTime = time;
              setCurrentTime(time);
            }}
            aria-label="Позиция видео"
            className="mb-2 h-1.5 w-full cursor-pointer accent-white"
            data-testid="input-video-progress"
          />
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => { void togglePlayback(); }}
              className="rounded-full p-1 transition hover:bg-white/15"
              aria-label={playing ? "Пауза" : "Воспроизвести"}
              data-testid="button-video-toggle"
            >
              {playing ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" />}
            </button>
            <span className="min-w-0 flex-1 text-[11px] font-medium tabular-nums text-white/85">
              {formatTime(currentTime)} <span className="text-white/50">/ {formatTime(duration)}</span>
            </span>
            <button
              type="button"
              onClick={() => setMuted(value => !value)}
              className="rounded-full p-1 transition hover:bg-white/15"
              aria-label={muted ? "Включить звук" : "Выключить звук"}
              data-testid="button-video-mute"
            >
              {muted ? <VolumeX size={17} /> : <Volume2 size={17} />}
            </button>
            <button
              type="button"
              onClick={() => { void toggleFullscreen(); }}
              className="rounded-full p-1 transition hover:bg-white/15"
              aria-label="На весь экран"
              data-testid="button-video-fullscreen"
            >
              <Maximize size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

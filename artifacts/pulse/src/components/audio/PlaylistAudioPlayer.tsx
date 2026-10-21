import { useEffect, useRef, useState } from "react";
import { Pause, Play, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import "./PlaylistAudioPlayer.css";

type PlaylistAudioPlayerProps = {
  src: string;
  className?: string;
};

function formatTime(value: number) {
  if (!Number.isFinite(value) || value < 0) return "0:00";
  const seconds = Math.floor(value);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function PlaylistAudioPlayer({ src, className }: PlaylistAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState(false);
  const progress = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  useEffect(() => {
    const pauseOtherPlayers = (event: Event) => {
      const activeAudio = (event as CustomEvent<HTMLAudioElement>).detail;
      if (audioRef.current && activeAudio !== audioRef.current) audioRef.current.pause();
    };
    window.addEventListener("nova:playlist-audio-play", pauseOtherPlayers);
    return () => window.removeEventListener("nova:playlist-audio-play", pauseOtherPlayers);
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setError(false);
    audio.load();
  }, [src]);

  useEffect(() => () => audioRef.current?.pause(), []);

  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = muted;
  }, [muted]);

  const togglePlayback = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      setError(false);
      void audio.play().catch(() => setError(true));
    } else {
      audio.pause();
    }
  };

  const seek = (value: number) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(value)) return;
    audio.currentTime = value;
    setCurrentTime(value);
  };

  return (
    <div className={cn(
      "w-full min-w-0 rounded-xl border border-border/80 bg-background/80 px-3 py-2.5",
      className,
    )}>
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        className="hidden"
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
        onDurationChange={(event) => setDuration(event.currentTarget.duration)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onPause={() => setPlaying(false)}
        onPlay={() => {
          window.dispatchEvent(new CustomEvent("nova:playlist-audio-play", { detail: audioRef.current }));
          setPlaying(true);
          setError(false);
        }}
        onEnded={(event) => {
          event.currentTarget.currentTime = 0;
          setPlaying(false);
          setCurrentTime(0);
        }}
        onError={() => setError(true)}
      />

      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={togglePlayback}
          aria-label={playing ? "Пауза" : "Воспроизвести"}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md shadow-primary/20 transition-transform hover:scale-105 active:scale-95"
        >
          {playing
            ? <Pause size={15} fill="currentColor" />
            : <Play size={15} fill="currentColor" className="ml-0.5" />}
        </button>

        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex items-center justify-between gap-2 text-[11px] tabular-nums text-muted-foreground">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
          <input
            type="range"
            min={0}
            max={duration || 1}
            step={0.1}
            value={Math.min(currentTime, duration || 0)}
            aria-label="Позиция воспроизведения"
            onChange={(event) => seek(Number(event.target.value))}
            style={{
              background: `linear-gradient(to right, hsl(var(--primary)) ${progress}%, hsl(var(--secondary)) ${progress}%)`,
            }}
            className="nova-audio-slider w-full"
          />
        </div>

        <button
          type="button"
          onClick={() => setMuted((value) => !value)}
          aria-label={muted ? "Включить звук" : "Выключить звук"}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          {muted ? <VolumeX size={17} /> : <Volume2 size={17} />}
        </button>
      </div>

      {error && <p role="status" className="mt-2 text-xs text-destructive">Не удалось воспроизвести аудио</p>}
    </div>
  );
}

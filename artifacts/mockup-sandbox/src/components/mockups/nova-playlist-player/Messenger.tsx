import { useEffect, useMemo, useRef, useState } from "react";
import { FileAudio, ListMusic, Pause, Play, Trash2, Volume2, VolumeX } from "lucide-react";
import "./_group.css";

function makeSampleAudio() {
  const sampleRate = 8000;
  const sampleCount = sampleRate * 12;
  const bytes = new ArrayBuffer(44 + sampleCount);
  const view = new DataView(bytes);
  const text = (offset: number, value: string) => {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(offset + index, value.charCodeAt(index));
    }
  };

  text(0, "RIFF");
  view.setUint32(4, 36 + sampleCount, true);
  text(8, "WAVE");
  text(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate, true);
  view.setUint16(32, 1, true);
  view.setUint16(34, 8, true);
  text(36, "data");
  view.setUint32(40, sampleCount, true);
  for (let index = 0; index < sampleCount; index += 1) {
    view.setUint8(44 + index, 128 + Math.round(Math.sin(index / 9) * 24));
  }

  let binary = "";
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  return `data:audio/wav;base64,${btoa(binary)}`;
}

const formatTime = (value: number) => {
  if (!Number.isFinite(value) || value < 0) return "0:00";
  const seconds = Math.floor(value);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
};

export function Messenger() {
  const src = useMemo(makeSampleAudio, []);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState(false);
  const progress = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

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

  return (
    <main className="dark min-h-screen flex items-center justify-center bg-background p-3 text-foreground">
      <section className="w-full rounded-3xl border border-border bg-card p-4 shadow-xl">
        <div className="mb-3 flex items-center gap-2">
          <ListMusic className="text-primary" size={18} />
          <h2 className="font-bold">Плейлист · greg</h2>
        </div>

        <div className="rounded-2xl bg-secondary/55 p-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
              <FileAudio size={14} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">Dajite_Tank_-_Utro_49163450</p>
              <p className="text-xs text-muted-foreground">Nova</p>
            </div>
            <button className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-background/60" aria-label="Удалить трек">
              <Trash2 size={14} />
            </button>
          </div>

          <div className="mt-2 rounded-xl border border-border/80 bg-background/80 px-3 py-2.5">
            <audio
              ref={audioRef}
              src={src}
              preload="metadata"
              className="hidden"
              onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
              onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
              onPlay={() => { setPlaying(true); setError(false); }}
              onPause={() => setPlaying(false)}
              onEnded={() => { setPlaying(false); setCurrentTime(0); }}
              onError={() => setError(true)}
            />

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={togglePlayback}
                aria-label={playing ? "Пауза" : "Воспроизвести"}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/20 transition-transform hover:scale-105 active:scale-95"
              >
                {playing ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
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
                  onChange={(event) => {
                    const nextTime = Number(event.target.value);
                    if (audioRef.current) audioRef.current.currentTime = nextTime;
                    setCurrentTime(nextTime);
                  }}
                  style={{ background: `linear-gradient(to right, hsl(var(--primary)) ${progress}%, hsl(var(--secondary)) ${progress}%)` }}
                  className="nova-player-range w-full"
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
            {error && <p className="mt-2 text-xs text-destructive">Не удалось воспроизвести аудио</p>}
          </div>
        </div>
      </section>
    </main>
  );
}

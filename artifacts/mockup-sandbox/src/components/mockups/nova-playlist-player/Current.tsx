import { useMemo } from "react";
import { ListMusic, Play, Trash2 } from "lucide-react";
import "./_group.css";

function makeSampleAudio() {
  const sampleRate = 8000;
  const sampleCount = sampleRate * 3;
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

export function Current() {
  const audio = useMemo(makeSampleAudio, []);

  return (
    <main className="dark min-h-screen flex items-center justify-center bg-background p-3 text-foreground">
      <section className="w-full rounded-3xl border border-border bg-card p-4 shadow-xl">
        <div className="mb-3 flex items-center gap-2">
          <ListMusic className="text-primary" size={18} />
          <h2 className="font-bold">Плейлист · greg</h2>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-secondary/50 p-2">
          <button className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground" aria-label="Воспроизвести">
            <Play size={14} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">Dajite_Tank_-_Utro_49163450</p>
            <p className="text-xs text-muted-foreground">Nova</p>
          </div>
          <button className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground" aria-label="Удалить трек">
            <Trash2 size={14} />
          </button>
          <audio src={audio} controls preload="metadata" className="w-full min-w-0" />
        </div>
      </section>
    </main>
  );
}

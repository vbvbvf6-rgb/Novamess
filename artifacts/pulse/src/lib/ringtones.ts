export interface RingtoneDefinition {
  id: string;
  label: string;
  emoji: string;
  desc: string;
}

export const RINGTONES: RingtoneDefinition[] = [
  { id: "pulse",   label: "Пульс",        emoji: "💓", desc: "Стандартный звонок" },
  { id: "classic", label: "Классический",  emoji: "📞", desc: "Двойной сигнал" },
  { id: "melody",  label: "Мелодия",       emoji: "🎵", desc: "Восходящая гамма" },
  { id: "gentle",  label: "Нежный",        emoji: "🌙", desc: "Мягкий перезвон" },
  { id: "retro",   label: "Ретро",         emoji: "☎️",  desc: "Старинный телефон" },
  { id: "custom",  label: "Своя мелодия",  emoji: "📁", desc: "Из ваших файлов" },
];

export function getSelectedRingtone(): string {
  return localStorage.getItem("pulse-ringtone") || "pulse";
}

type StopFn = () => void;

function playNotes(
  ctx: AudioContext,
  notes: { freq: number; type?: OscillatorType; start: number; dur: number }[],
  gainValue: number,
) {
  const master = ctx.createGain();
  master.gain.value = gainValue;
  master.connect(ctx.destination);
  for (const note of notes) {
    const osc = ctx.createOscillator();
    osc.type = note.type ?? "sine";
    osc.frequency.value = note.freq;
    osc.connect(master);
    osc.start(ctx.currentTime + note.start);
    osc.stop(ctx.currentTime + note.start + note.dur);
  }
}

function playOneCycle(ctx: AudioContext, id: string): number {
  switch (id) {
    case "pulse":
      playNotes(ctx, [{ freq: 660, start: 0, dur: 0.4 }], 0.09);
      return 400;
    case "classic":
      playNotes(ctx, [
        { freq: 880, start: 0,    dur: 0.25 },
        { freq: 880, start: 0.35, dur: 0.25 },
      ], 0.1);
      return 600;
    case "melody":
      playNotes(ctx, [
        { freq: 523,  start: 0,    dur: 0.15 },
        { freq: 659,  start: 0.18, dur: 0.15 },
        { freq: 784,  start: 0.36, dur: 0.15 },
        { freq: 1047, start: 0.54, dur: 0.35 },
      ], 0.1);
      return 950;
    case "gentle":
      playNotes(ctx, [
        { freq: 1047, start: 0,   dur: 0.7 },
        { freq: 1319, start: 0.3, dur: 0.7 },
      ], 0.065);
      return 1050;
    case "retro": {
      const master = ctx.createGain();
      master.gain.value = 0.08;
      master.connect(ctx.destination);
      for (const freq of [425, 480]) {
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.value = freq;
        osc.connect(master);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 1.5);
      }
      return 1500;
    }
    default:
      playNotes(ctx, [{ freq: 660, start: 0, dur: 0.4 }], 0.09);
      return 400;
  }
}

function gapMs(id: string): number {
  switch (id) {
    case "pulse":   return 1600;
    case "classic": return 2000;
    case "melody":  return 1500;
    case "gentle":  return 2500;
    case "retro":   return 3500;
    default:        return 1600;
  }
}

/* ── IndexedDB helpers for custom audio ─────────────────────────── */

function openRingtoneDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("pulse-ringtones", 1);
    req.onupgradeneeded = () => req.result.createObjectStore("files");
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function storeCustomRingtone(arrayBuffer: ArrayBuffer): Promise<void> {
  const db = await openRingtoneDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("files", "readwrite");
    tx.objectStore("files").put(arrayBuffer, "custom");
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

async function loadCustomRingtone(): Promise<ArrayBuffer | null> {
  try {
    const db = await openRingtoneDB();
    return await new Promise<ArrayBuffer | null>((resolve) => {
      const tx = db.transaction("files", "readonly");
      const req = tx.objectStore("files").get("custom");
      req.onsuccess = () => { db.close(); resolve(req.result ?? null); };
      req.onerror = () => { db.close(); resolve(null); };
    });
  } catch { return null; }
}

/* ── Custom-file looping player ─────────────────────────────────── */

function playCustomLoop(buffer: AudioBuffer, onStop: () => boolean): StopFn {
  let ctx: AudioContext | null = new AudioContext();
  let sourceNode: AudioBufferSourceNode | null = null;
  let stopped = false;

  const play = () => {
    if (stopped || !ctx) return;
    sourceNode = ctx.createBufferSource();
    sourceNode.buffer = buffer;
    sourceNode.connect(ctx.destination);
    sourceNode.onended = () => {
      if (!stopped) setTimeout(play, 1000);
    };
    sourceNode.start();
  };

  play();

  return () => {
    stopped = true;
    try { sourceNode?.stop(); } catch {}
    ctx?.close();
    ctx = null;
  };
}

/* ── Public API ─────────────────────────────────────────────────── */

/** Short notification ding played for incoming messages (in-app). */
export function playNotificationSound(): void {
  try {
    const AudioCtx = window.AudioContext ?? (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx() as AudioContext;
    // Two-tone "ping": a high note then a slightly higher one
    playNotes(ctx, [
      { freq: 1047, start: 0,    dur: 0.10, type: "sine" },
      { freq: 1319, start: 0.12, dur: 0.16, type: "sine" },
    ], 0.07);
    setTimeout(() => { try { ctx.close(); } catch {} }, 600);
  } catch {}
}


export function playRingtone(ringtoneId: string): StopFn {
  if (ringtoneId === "custom") {
    let stopped = false;
    let stopFn: StopFn | null = null;

    loadCustomRingtone().then(ab => {
      if (stopped || !ab) return;
      const ctx = new AudioContext();
      ctx.decodeAudioData(ab).then(buffer => {
        if (stopped) { ctx.close(); return; }
        stopFn = playCustomLoop(buffer, () => stopped);
      }).catch(() => ctx.close());
    });

    return () => {
      stopped = true;
      stopFn?.();
    };
  }

  let stopped = false;
  let ctx: AudioContext | null = null;
  const timeouts: ReturnType<typeof setTimeout>[] = [];

  const tick = () => {
    if (stopped) return;
    ctx = new AudioContext();
    const cycleDur = playOneCycle(ctx, ringtoneId);
    timeouts.push(
      setTimeout(() => {
        ctx?.close();
        ctx = null;
        if (!stopped) timeouts.push(setTimeout(tick, gapMs(ringtoneId)));
      }, cycleDur + 50),
    );
  };

  timeouts.push(setTimeout(tick, 200));

  return () => {
    stopped = true;
    timeouts.forEach(clearTimeout);
    ctx?.close();
    ctx = null;
  };
}

export function previewRingtone(ringtoneId: string): void {
  if (ringtoneId === "custom") {
    loadCustomRingtone().then(ab => {
      if (!ab) return;
      const ctx = new AudioContext();
      ctx.decodeAudioData(ab).then(buffer => {
        const src = ctx.createBufferSource();
        src.buffer = buffer;
        src.connect(ctx.destination);
        src.start();
        setTimeout(() => { try { src.stop(); } catch {} ctx.close(); }, 5000);
      }).catch(() => ctx.close());
    });
    return;
  }
  try {
    const ctx = new AudioContext();
    playOneCycle(ctx, ringtoneId);
    setTimeout(() => ctx.close(), 2500);
  } catch {}
}

/** Telecom-standard ringback tone for the caller (440 Hz, 2s ON / 4s OFF). */
export function playRingbackTone(): StopFn {
  let stopped = false;
  let ctx: AudioContext | null = null;
  const timeouts: ReturnType<typeof setTimeout>[] = [];

  const tick = () => {
    if (stopped) return;
    ctx = new AudioContext();
    playNotes(ctx, [{ freq: 440, start: 0, dur: 2 }], 0.06);
    timeouts.push(
      setTimeout(() => {
        ctx?.close();
        ctx = null;
        if (!stopped) timeouts.push(setTimeout(tick, 4000));
      }, 2100),
    );
  };

  timeouts.push(setTimeout(tick, 300));

  return () => {
    stopped = true;
    timeouts.forEach(clearTimeout);
    ctx?.close();
    ctx = null;
  };
}

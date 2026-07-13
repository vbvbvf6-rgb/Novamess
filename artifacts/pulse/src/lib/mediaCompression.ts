// Client-side video compression to keep storage footprint small.
// There is no external object storage configured for this app — every
// image/video attachment is stored inline in Postgres — so shrinking
// large files (especially phone camera videos) before upload matters a lot.
//
// Approach: draw the video onto a downscaled <canvas>, re-encode it via
// MediaRecorder at a modest bitrate, and keep the original audio track.
// This is best-effort: if the browser doesn't support the required APIs,
// or the "compressed" result isn't actually smaller, we fall back to the
// original file untouched.

export interface CompressedVideo {
  blob: Blob;
  mime: string;
}

const VIDEO_MAX_DIMENSION = 640;
const VIDEO_BITRATE = 800_000; // ~800 kbps — good enough for chat previews

function pickSupportedMime(): string {
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  for (const m of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported?.(m)) return m;
  }
  return "";
}

export async function compressVideo(file: File): Promise<CompressedVideo | null> {
  if (typeof MediaRecorder === "undefined") return null;

  return new Promise((resolve) => {
    let settled = false;
    const finish = (result: CompressedVideo | null) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    try {
      const video = document.createElement("video");
      video.muted = true;
      video.playsInline = true;
      (video as any).preload = "auto";
      const url = URL.createObjectURL(file);
      video.src = url;

      // Safety timeout: never hang the UI waiting on a broken/huge video.
      const safetyTimer = setTimeout(() => {
        URL.revokeObjectURL(url);
        finish(null);
      }, 45_000);

      video.onloadedmetadata = async () => {
        try {
          let w = video.videoWidth;
          let h = video.videoHeight;
          if (!w || !h) { finish(null); return; }
          if (w > VIDEO_MAX_DIMENSION || h > VIDEO_MAX_DIMENSION) {
            if (w > h) { h = Math.round((h * VIDEO_MAX_DIMENSION) / w); w = VIDEO_MAX_DIMENSION; }
            else { w = Math.round((w * VIDEO_MAX_DIMENSION) / h); h = VIDEO_MAX_DIMENSION; }
          }

          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          const captureStream = (canvas as any).captureStream;
          if (!ctx || typeof captureStream !== "function") { finish(null); return; }

          const canvasStream: MediaStream = captureStream.call(canvas, 30);
          let audioTracks: MediaStreamTrack[] = [];
          try {
            const grab = (video as any).captureStream || (video as any).mozCaptureStream;
            const mediaStream: MediaStream | undefined = grab?.call(video);
            if (mediaStream) audioTracks = mediaStream.getAudioTracks();
          } catch { /* audio capture is best-effort */ }

          const combined = new MediaStream([...canvasStream.getVideoTracks(), ...audioTracks]);
          const mimeType = pickSupportedMime();
          const recorder = new MediaRecorder(
            combined,
            mimeType ? { mimeType, videoBitsPerSecond: VIDEO_BITRATE } : { videoBitsPerSecond: VIDEO_BITRATE }
          );
          const chunks: Blob[] = [];
          recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
          recorder.onerror = () => { clearTimeout(safetyTimer); URL.revokeObjectURL(url); finish(null); };
          recorder.onstop = () => {
            clearTimeout(safetyTimer);
            URL.revokeObjectURL(url);
            if (!chunks.length) { finish(null); return; }
            finish({ blob: new Blob(chunks, { type: mimeType || "video/webm" }), mime: mimeType || "video/webm" });
          };

          let drawing = true;
          const draw = () => {
            if (!drawing) return;
            try { ctx.drawImage(video, 0, 0, w, h); } catch { /* ignore transient decode errors */ }
            requestAnimationFrame(draw);
          };
          video.onended = () => { drawing = false; try { recorder.stop(); } catch {} };
          video.onerror = () => { drawing = false; clearTimeout(safetyTimer); URL.revokeObjectURL(url); finish(null); };

          recorder.start();
          await video.play();
          draw();
        } catch {
          clearTimeout(safetyTimer);
          URL.revokeObjectURL(url);
          finish(null);
        }
      };
      video.onerror = () => { clearTimeout(safetyTimer); URL.revokeObjectURL(url); finish(null); };
    } catch {
      finish(null);
    }
  });
}

/** Convert a Blob/File to a data URL string. */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Try to compress a video file for upload. Only uses the compressed
 * result if it's meaningfully smaller than the original (otherwise the
 * re-encode isn't worth the quality loss); falls back to the original
 * file's data URL on any failure or unsupported browser.
 */
export async function prepareVideoForUpload(file: File): Promise<string> {
  try {
    const compressed = await compressVideo(file);
    if (compressed && compressed.blob.size > 0 && compressed.blob.size < file.size * 0.85) {
      return await blobToDataUrl(compressed.blob);
    }
  } catch { /* fall through to original */ }
  return await blobToDataUrl(file);
}

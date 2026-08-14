// Reads a local video File's duration client-side (via a hidden <video>
// element) before it's ever uploaded. Shared by every admin form that lets
// an editor pick a video file, so duration is always read from the file
// itself rather than typed freely.
export function getVideoDurationSeconds(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      const total = Math.round(video.duration);
      resolve(isFinite(total) && total > 0 ? total : 0);
    };
    video.onerror = () => { URL.revokeObjectURL(url); resolve(0); };
    video.src = url;
  });
}

// "1:02:03" / "4:05" — used by the Video Library, where durations sit next
// to a play button and read like a player's clock.
export function formatDurationCompact(totalSeconds: number): string {
  if (!totalSeconds) return "";
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}

// "2h 30m" / "45m" — used by Courses, matching the existing "duration"
// string style ("2h", "1h 30m") used across the Learning Centre.
export function formatDurationHuman(totalSeconds: number): string {
  if (!totalSeconds) return "";
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.round((totalSeconds % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

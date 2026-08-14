import { Clock } from "lucide-react";

const WARNING_THRESHOLD_MS = 5 * 60 * 1000; // last 5 minutes

function formatRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// Small, always-visible countdown to the 1-hour inactivity auto-logout —
// resets on any activity via useInactivityLogout. Hidden on the narrowest
// screens so it doesn't crowd an already-tight mobile header.
export function InactivityTimer({ remainingMs }: { remainingMs: number }) {
  const warning = remainingMs <= WARNING_THRESHOLD_MS;
  return (
    <span
      title="You'll be automatically signed out after 1 hour of inactivity"
      className={`hidden sm:inline-flex items-center gap-1 text-[11px] font-sans font-medium px-2 py-1 rounded-full border transition-colors ${
        warning
          ? "border-destructive/40 text-destructive bg-destructive/10"
          : "border-border text-muted-foreground"
      }`}
    >
      <Clock className="h-3 w-3" />
      {formatRemaining(remainingMs)}
    </span>
  );
}

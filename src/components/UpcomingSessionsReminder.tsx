import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, X } from "lucide-react";
import { getSessions, type LiveSession } from "@/services/cmsService";
import { isPastSession, SESSIONS_REMINDER_DISMISSED_KEY } from "@/lib/sessions";

export function UpcomingSessionsReminder() {
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem(SESSIONS_REMINDER_DISMISSED_KEY) === "1"
  );

  useEffect(() => {
    if (dismissed) return;
    getSessions().then(({ sessions: data }) => {
      setSessions((data ?? []).filter((s) => !isPastSession(s)));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dismiss = () => {
    sessionStorage.setItem(SESSIONS_REMINDER_DISMISSED_KEY, "1");
    setDismissed(true);
  };

  if (dismissed || sessions.length === 0) return null;

  const next = sessions[0];

  return (
    <div className="fixed bottom-6 left-4 sm:left-6 z-40 w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-border bg-card shadow-xl overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="flex items-start gap-3 p-4">
        <div className="h-9 w-9 rounded-full bg-accent/15 text-accent flex items-center justify-center shrink-0">
          <CalendarDays className="h-4.5 w-4.5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">
            {sessions.length === 1 ? "1 upcoming session" : `${sessions.length} upcoming sessions`}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            Next: {next.title} — {next.date}
          </p>
          <Link
            to="/learning"
            onClick={dismiss}
            className="inline-block mt-2 text-xs font-semibold text-accent hover:underline"
          >
            View sessions →
          </Link>
        </div>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={dismiss}
          className="h-6 w-6 shrink-0 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

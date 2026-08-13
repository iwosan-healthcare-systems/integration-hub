import type { LiveSession } from "@/services/cmsService";

// A session is "past" once its calendar day is behind today — it stays
// listed as upcoming for its entire scheduled day. `time` is a free-text
// field admins type by hand (e.g. "10:00 AM"), so it isn't reliable to
// parse for a precise cutoff; the date field alone is what's structured.
export function isPastSession(session: LiveSession): boolean {
  const d = new Date(session.date);
  if (isNaN(d.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return d.getTime() < today.getTime();
}

// Cleared on every fresh login (see AuthContext.setUser) so a dismissed
// reminder reappears next time someone signs in, rather than staying
// dismissed forever.
export const SESSIONS_REMINDER_DISMISSED_KEY = "iwosan_dismissed_sessions_reminder";

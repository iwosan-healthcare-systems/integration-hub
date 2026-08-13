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

// Parses either the "HH:MM" (24h) value the <input type="time"> field now
// produces, or a legacy free-text time ("10:00 AM", "2:30pm" …) still
// sitting on sessions saved before that field existed. Returns null if it
// can't make sense of it, so callers can fall back safely.
function parseTimeString(time: string): { hour: number; minute: number } | null {
  const match = time.match(/(\d{1,2})(?::(\d{2}))?\s*([AaPp][Mm])?/);
  if (!match) return null;
  let hour = parseInt(match[1], 10);
  const minute = match[2] ? parseInt(match[2], 10) : 0;
  const meridiem = match[3]?.toLowerCase();
  if (meridiem === "pm" && hour < 12) hour += 12;
  if (meridiem === "am" && hour === 12) hour = 0;
  if (hour > 23 || minute > 59) return null;
  return { hour, minute };
}

function parseSessionDateTime(session: LiveSession): Date | null {
  const day = new Date(session.date);
  if (isNaN(day.getTime())) return null;
  const parsed = parseTimeString(session.time);
  if (!parsed) return null;
  day.setHours(parsed.hour, parsed.minute, 0, 0);
  return day;
}

// Display formatting: "14:05" -> "2:05 PM". Legacy free-text values that
// aren't in the time-input's HH:MM shape are already human-readable, so
// they're returned unchanged rather than mangled.
export function formatSessionTime(time: string): string {
  if (!/^\d{1,2}:\d{2}$/.test(time)) return time;
  const parsed = parseTimeString(time);
  if (!parsed) return time;
  const period = parsed.hour >= 12 ? "PM" : "AM";
  const hour12 = parsed.hour % 12 || 12;
  return `${hour12}:${String(parsed.minute).padStart(2, "0")} ${period}`;
}

// For populating <input type="time" value={...}> when editing a session
// that still has a legacy free-text time — converts to the "HH:MM" (24h,
// zero-padded) shape the input requires. Returns "" if unparseable, which
// the input just treats as empty rather than erroring.
export function toTimeInputValue(time: string): string {
  const parsed = parseTimeString(time);
  if (!parsed) return "";
  return `${String(parsed.hour).padStart(2, "0")}:${String(parsed.minute).padStart(2, "0")}`;
}

// For the homepage reminder specifically: a session should stop being
// "worth reminding about" once its actual start time has passed, even if
// its day isn't over yet (unlike isPastSession, which intentionally keeps
// a session listed as upcoming all day). Falls back to isPastSession's
// date-only rule if the time can't be parsed, rather than hiding it early.
export function hasSessionStarted(session: LiveSession): boolean {
  const at = parseSessionDateTime(session);
  if (at) return at.getTime() <= Date.now();
  return isPastSession(session);
}

// Cleared on every fresh login (see AuthContext.setUser) so a dismissed
// reminder reappears next time someone signs in, rather than staying
// dismissed forever.
export const SESSIONS_REMINDER_DISMISSED_KEY = "iwosan_dismissed_sessions_reminder";

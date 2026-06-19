import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, RefreshCw, X, MapPin, Video, Layers, Link } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  getSessions, createSession, updateSession, deleteSession,
  type LiveSession, type SessionInput,
} from '@/services/cmsService';

const FORMAT_OPTIONS = ['Virtual', 'In-Person', 'Hybrid'] as const;

const formatColor: Record<string, string> = {
  Virtual: 'bg-violet-100 text-violet-700 border-violet-300/60',
  'In-Person': 'bg-emerald-100 text-emerald-700 border-emerald-300/60',
  Hybrid: 'bg-amber-100 text-amber-700 border-amber-300/60',
};

const FormatIcon = ({ format }: { format: string }) => {
  if (format === 'Virtual') return <Video className="h-3 w-3" />;
  if (format === 'Hybrid') return <Layers className="h-3 w-3" />;
  return <MapPin className="h-3 w-3" />;
};

// ── Session Form Modal ─────────────────────────────────────────────────────

interface SessionFormProps {
  item?: LiveSession;
  onClose: () => void;
  onSaved: (item: LiveSession) => void;
}

function toIsoDate(displayDate: string): string {
  const d = new Date(displayDate);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
}

function SessionFormModal({ item, onClose, onSaved }: SessionFormProps) {
  const isEdit = !!item;
  const [form, setForm] = useState<SessionInput>({
    title: item?.title ?? '',
    date: item ? toIsoDate(item.date) : '',
    time: item?.time ?? '',
    format: item?.format ?? 'Virtual',
    venue: item?.venue ?? '',
    host: item?.host ?? '',
    meetingUrl: item?.meetingUrl ?? '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function set<K extends keyof SessionInput>(field: K, value: SessionInput[K]) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const result = isEdit
      ? await updateSession(item!.id, form)
      : await createSession(form);
    setLoading(false);
    if (result.error) { setError(result.error); return; }
    onSaved(result.session!);
    onClose();
  }

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Session' : 'Add Session'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor="s-title">Session Title</Label>
            <Input id="s-title" value={form.title} onChange={(e) => set('title', e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="s-date">Date</Label>
              <Input id="s-date" type="date" value={form.date} onChange={(e) => set('date', e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-time">Time</Label>
              <Input id="s-time" value={form.time} onChange={(e) => set('time', e.target.value)} placeholder="e.g. 10:00 AM" required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="s-format">Format</Label>
            <Select value={form.format} onValueChange={(v) => set('format', v as SessionInput['format'])}>
              <SelectTrigger id="s-format"><SelectValue /></SelectTrigger>
              <SelectContent>
                {FORMAT_OPTIONS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="s-venue">Venue</Label>
            <Input id="s-venue" value={form.venue} onChange={(e) => set('venue', e.target.value)} placeholder="e.g. Microsoft Teams, Conference Room A" />
          </div>
          {(form.format === 'Virtual' || form.format === 'Hybrid') && (
            <div className="space-y-1.5">
              <Label htmlFor="s-link" className="flex items-center gap-1.5">
                <Link className="h-3.5 w-3.5" />
                Meeting Link
              </Label>
              <Input
                id="s-link"
                type="url"
                value={form.meetingUrl ?? ''}
                onChange={(e) => set('meetingUrl', e.target.value)}
                placeholder="https://teams.microsoft.com/… or https://zoom.us/…"
              />
              <p className="text-xs text-muted-foreground">Users will see a "Join" button that opens this link.</p>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="s-host">Host / Organiser</Label>
            <Input id="s-host" value={form.host} onChange={(e) => set('host', e.target.value)} placeholder="e.g. HR Department" />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? <span className="flex items-center gap-2"><span className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />{isEdit ? 'Saving…' : 'Creating…'}</span> : isEdit ? 'Save Changes' : 'Create Session'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function SessionsManagePage() {
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalError, setGlobalError] = useState('');
  const [formTarget, setFormTarget] = useState<LiveSession | 'new' | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LiveSession | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    setGlobalError('');
    const { sessions: data, error } = await getSessions();
    if (error) setGlobalError(error);
    else setSessions(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSaved = (saved: LiveSession) => {
    setSessions((prev) => {
      const idx = prev.findIndex((s) => s.id === saved.id);
      return idx >= 0 ? prev.map((s) => (s.id === saved.id ? saved : s)) : [...prev, saved];
    });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setActionLoading(deleteTarget.id);
    const { error } = await deleteSession(deleteTarget.id);
    setActionLoading(null);
    if (error) { setGlobalError(error); setDeleteTarget(null); return; }
    setSessions((prev) => prev.filter((s) => s.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Live Sessions</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{sessions.length} upcoming session{sessions.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setFormTarget('new')} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Session
          </Button>
        </div>
      </div>

      {globalError && (
        <div className="flex items-center justify-between rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
          {globalError}
          <button type="button" aria-label="Dismiss error" onClick={() => setGlobalError('')}><X className="h-3.5 w-3.5" /></button>
        </div>
      )}

      <Card className="border-border/60 overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[500px]">
            <div className="grid grid-cols-[1fr_7rem_10rem_4.5rem] gap-3 px-5 py-2.5 border-b border-border/60 bg-muted/50 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
              <span>Session</span>
              <span className="text-center">Format</span>
              <span className="text-center">Date & Time</span>
              <span className="text-right">Actions</span>
            </div>
            <CardContent className="p-0">
              {loading ? (
                <div>
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4 px-5 py-3.5 border-b border-border/40 last:border-0">
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3.5 w-2/3 rounded bg-muted animate-pulse" />
                        <div className="h-3 w-1/3 rounded bg-muted animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : sessions.length === 0 ? (
                <p className="text-sm text-muted-foreground px-5 py-8 text-center">No sessions scheduled. Click "Add Session" to create one.</p>
              ) : (
                <div>
                  {sessions.map((s, idx) => (
                    <div
                      key={s.id}
                      className={`grid grid-cols-[1fr_7rem_10rem_4.5rem] gap-3 items-center px-5 py-3.5 hover:bg-muted/40 transition-colors ${idx < sessions.length - 1 ? 'border-b border-border/40' : ''}`}
                    >
                      {/* Session info */}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{s.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{s.venue} · {s.host}</p>
                        {s.meetingUrl && (
                          <a href={s.meetingUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-accent transition-colors mt-0.5">
                            <Link className="h-2.5 w-2.5" /> Meeting link
                          </a>
                        )}
                      </div>

                      {/* Format badge */}
                      <div className="flex justify-center">
                        <Badge className={`text-[10px] inline-flex items-center gap-1 ${formatColor[s.format] ?? ''}`}>
                          <FormatIcon format={s.format} />
                          {s.format}
                        </Badge>
                      </div>

                      {/* Date & Time */}
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">{s.date}</p>
                        <p className="text-xs text-muted-foreground/60">{s.time}</p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-end gap-1">
                        <Button aria-label="Edit session" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => setFormTarget(s)} disabled={actionLoading === s.id}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button aria-label="Delete session" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setDeleteTarget(s)} disabled={actionLoading === s.id}>
                          {actionLoading === s.id
                            ? <span className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            : <Trash2 className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </div>
        </div>
      </Card>

      {formTarget !== null && (
        <SessionFormModal
          item={formTarget === 'new' ? undefined : formTarget}
          onClose={() => setFormTarget(null)}
          onSaved={handleSaved}
        />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete session?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>"{deleteTarget?.title}"</strong>. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, RefreshCw, X, BookOpen, Clock, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PreviewDialog } from '@/components/cms/previews/PreviewDialog';
import { LearningPathPreviewCard } from '@/components/cms/previews/PreviewCards';
import { CmsSearchBar } from '@/components/cms/CmsSearchBar';
import {
  getLearningPaths, getCourses, createLearningPath, updateLearningPath, deleteLearningPath,
  type LearningPath, type Course, type LearningPathInput,
} from '@/services/cmsService';

const ICONS = ['Rocket', 'Stethoscope', 'Monitor', 'Users', 'GraduationCap', 'BookOpen'];

// ── Learning Path Form Modal ───────────────────────────────────────────────

interface PathFormProps {
  item?: LearningPath;
  courses: Course[];
  onClose: () => void;
  onSaved: (item: LearningPath) => void;
}

function PathFormModal({ item, courses, onClose, onSaved }: PathFormProps) {
  const isEdit = !!item;
  const [form, setForm] = useState<LearningPathInput>({
    title: item?.title ?? '',
    description: item?.description ?? '',
    audience: item?.audience ?? '',
    courseIds: item?.courseIds ?? [],
    totalDuration: item?.totalDuration ?? '',
    icon: item?.icon ?? 'GraduationCap',
    sortOrder: item?.sortOrder ?? 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);

  function set<K extends keyof LearningPathInput>(field: K, value: LearningPathInput[K]) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function toggleCourse(id: string) {
    setForm((f) => ({
      ...f,
      courseIds: f.courseIds.includes(id)
        ? f.courseIds.filter((c) => c !== id)
        : [...f.courseIds, id],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const result = isEdit
      ? await updateLearningPath(item!.id, form)
      : await createLearningPath(form);
    setLoading(false);
    if (result.error) { setError(result.error); return; }
    onSaved(result.learningPath!);
    onClose();
  }

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Learning Path' : 'Add Learning Path'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor="lp-title">Title</Label>
            <Input id="lp-title" value={form.title} onChange={(e) => set('title', e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lp-desc">Description</Label>
            <textarea
              id="lp-desc"
              title="Description"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              rows={2}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="lp-aud">Audience</Label>
              <Input id="lp-aud" value={form.audience} onChange={(e) => set('audience', e.target.value)} placeholder="e.g. All New Staff" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lp-dur">Total Duration</Label>
              <Input id="lp-dur" value={form.totalDuration} onChange={(e) => set('totalDuration', e.target.value)} placeholder="e.g. 6h 30m" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="lp-icon">Icon</Label>
              <Select value={form.icon} onValueChange={(v) => set('icon', v)}>
                <SelectTrigger id="lp-icon"><SelectValue /></SelectTrigger>
                <SelectContent>{ICONS.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lp-order">Sort Order</Label>
              <Input id="lp-order" type="number" min={0} value={form.sortOrder} onChange={(e) => set('sortOrder', parseInt(e.target.value) || 0)} />
            </div>
          </div>

          {/* Course multi-select */}
          <div className="space-y-2">
            <Label>Courses in this path</Label>
            <div className="rounded-md border border-input max-h-52 overflow-y-auto divide-y divide-border/50">
              {courses.length === 0 ? (
                <p className="text-xs text-muted-foreground px-3 py-2">No courses available.</p>
              ) : (
                courses.map((c) => (
                  <label key={c.id} className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-muted/40 transition-colors">
                    <input
                      type="checkbox"
                      checked={form.courseIds.includes(c.id)}
                      onChange={() => toggleCourse(c.id)}
                      className="h-4 w-4 rounded border-input accent-accent"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{c.title}</p>
                      <p className="text-xs text-muted-foreground">{c.category} · {c.duration}</p>
                    </div>
                  </label>
                ))
              )}
            </div>
            <p className="text-xs text-muted-foreground">{form.courseIds.length} course{form.courseIds.length !== 1 ? 's' : ''} selected</p>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter className="sm:justify-between">
            <Button type="button" variant="outline" className="gap-2" onClick={() => setPreviewOpen(true)}>
              <Eye className="h-3.5 w-3.5" />Preview
            </Button>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={loading}>
                {loading ? <span className="flex items-center gap-2"><span className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />{isEdit ? 'Saving…' : 'Creating…'}</span> : isEdit ? 'Save Changes' : 'Create Path'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>

      <PreviewDialog open={previewOpen} onOpenChange={setPreviewOpen} className="sm:max-w-sm">
        <LearningPathPreviewCard path={form} courses={courses} />
      </PreviewDialog>
    </Dialog>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function LearningPathsManagePage() {
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalError, setGlobalError] = useState('');
  const [formTarget, setFormTarget] = useState<LearningPath | 'new' | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LearningPath | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  const filtered = paths.filter((p) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.audience.toLowerCase().includes(q);
  });

  const load = async () => {
    setLoading(true);
    setGlobalError('');
    const [lp, c] = await Promise.all([getLearningPaths(), getCourses()]);
    if (lp.error) setGlobalError(lp.error);
    else {
      setPaths(lp.learningPaths ?? []);
      setCourses(c.courses ?? []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSaved = (saved: LearningPath) => {
    setPaths((prev) => {
      const idx = prev.findIndex((p) => p.id === saved.id);
      return idx >= 0 ? prev.map((p) => (p.id === saved.id ? saved : p)) : [saved, ...prev];
    });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setActionLoading(deleteTarget.id);
    const { error } = await deleteLearningPath(deleteTarget.id);
    setActionLoading(null);
    if (error) { setGlobalError(error); setDeleteTarget(null); return; }
    setPaths((prev) => prev.filter((p) => p.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Learning Paths</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{paths.length} path{paths.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setFormTarget('new')} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Path
          </Button>
        </div>
      </div>

      <CmsSearchBar value={search} onChange={setSearch} placeholder="Search learning paths by title or audience…" />

      {globalError && (
        <div className="flex items-center justify-between rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
          {globalError}
          <button type="button" aria-label="Dismiss error" onClick={() => setGlobalError('')}><X className="h-3.5 w-3.5" /></button>
        </div>
      )}

      <Card className="border-border/60 overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[520px]">
            <div className="grid grid-cols-[1fr_11rem_8rem_4.5rem] gap-3 px-5 py-2.5 border-b border-border/60 bg-muted/50 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
              <span>Learning Path</span>
              <span className="text-center">Audience</span>
              <span className="text-center">Courses / Time</span>
              <span className="text-right">Actions</span>
            </div>
            <CardContent className="p-0">
              {loading ? (
                <div>
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4 px-5 py-3.5 border-b border-border/40 last:border-0">
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3.5 w-2/3 rounded bg-muted animate-pulse" />
                        <div className="h-3 w-1/3 rounded bg-muted animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground px-5 py-8 text-center">
                  {paths.length === 0 ? 'No learning paths yet.' : 'No learning paths match your search.'}
                </p>
              ) : (
                <div>
                  {filtered.map((p, idx) => (
                    <div
                      key={p.id}
                      className={`grid grid-cols-[1fr_11rem_8rem_4.5rem] gap-3 items-center px-5 py-3.5 hover:bg-muted/40 transition-colors ${idx < filtered.length - 1 ? 'border-b border-border/40' : ''}`}
                    >
                      {/* Title + description */}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{p.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{p.description}</p>
                      </div>

                      {/* Audience — plain text, truncated */}
                      <p className="text-xs text-muted-foreground text-center truncate px-1" title={p.audience}>{p.audience}</p>

                      {/* Courses / Time */}
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-xs text-muted-foreground flex items-center gap-1"><BookOpen className="h-3 w-3 shrink-0" />{p.courseIds.length} course{p.courseIds.length !== 1 ? 's' : ''}</span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3 shrink-0" />{p.totalDuration}</span>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-end gap-1">
                        <Button aria-label="Edit learning path" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => setFormTarget(p)} disabled={actionLoading === p.id}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button aria-label="Delete learning path" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setDeleteTarget(p)} disabled={actionLoading === p.id}>
                          {actionLoading === p.id
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
        <PathFormModal
          item={formTarget === 'new' ? undefined : formTarget}
          courses={courses}
          onClose={() => setFormTarget(null)}
          onSaved={handleSaved}
        />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete learning path?</AlertDialogTitle>
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

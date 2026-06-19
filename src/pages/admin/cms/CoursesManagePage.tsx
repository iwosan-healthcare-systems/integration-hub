import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, RefreshCw, X, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  getCourses, createCourse, updateCourse, deleteCourse,
  type Course, type CourseInput,
} from '@/services/cmsService';

const CATEGORIES = ['Onboarding','Clinical','Compliance','IT & Digital','Leadership','Soft Skills'];
const LEVELS = ['Beginner','Intermediate','Advanced'];

// ── Course Form Modal ──────────────────────────────────────────────────────

interface CourseFormProps {
  item?: Course;
  onClose: () => void;
  onSaved: (item: Course) => void;
}

function CourseFormModal({ item, onClose, onSaved }: CourseFormProps) {
  const isEdit = !!item;
  const [form, setForm] = useState<CourseInput>({
    id: item?.id ?? '',
    title: item?.title ?? '',
    description: item?.description ?? '',
    category: item?.category ?? 'Onboarding',
    level: item?.level ?? 'Beginner',
    duration: item?.duration ?? '',
    audience: item?.audience ?? '',
    modules: item?.modules ?? 1,
    mandatory: item?.mandatory ?? false,
    courseUrl: item?.courseUrl ?? '',
    sortOrder: item?.sortOrder ?? 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function set<K extends keyof CourseInput>(field: K, value: CourseInput[K]) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const result = isEdit
      ? await updateCourse(item!.id, { title: form.title, description: form.description, category: form.category, level: form.level, duration: form.duration, audience: form.audience, modules: form.modules, mandatory: form.mandatory, courseUrl: form.courseUrl, sortOrder: form.sortOrder })
      : await createCourse(form);
    setLoading(false);
    if (result.error) { setError(result.error); return; }
    onSaved(result.course!);
    onClose();
  }

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Course' : 'Add Course'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {!isEdit && (
            <div className="space-y-1.5">
              <Label htmlFor="c-id">Course ID (slug)</Label>
              <Input id="c-id" value={form.id} onChange={(e) => set('id', e.target.value.toLowerCase().replace(/\s+/g,'-'))} placeholder="e.g. fire-safety" required />
              <p className="text-xs text-muted-foreground">Unique identifier, lowercase with hyphens. Cannot be changed after creation.</p>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="c-title">Title</Label>
            <Input id="c-title" value={form.title} onChange={(e) => set('title', e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-desc">Description</Label>
            <textarea
              id="c-desc"
              title="Description"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="c-cat">Category</Label>
              <Select value={form.category} onValueChange={(v) => set('category', v as Course['category'])}>
                <SelectTrigger id="c-cat"><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-level">Level</Label>
              <Select value={form.level} onValueChange={(v) => set('level', v as Course['level'])}>
                <SelectTrigger id="c-level"><SelectValue /></SelectTrigger>
                <SelectContent>{LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="c-dur">Duration</Label>
              <Input id="c-dur" value={form.duration} onChange={(e) => set('duration', e.target.value)} placeholder="e.g. 2h 30m" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-mods">Modules</Label>
              <Input id="c-mods" type="number" min={1} value={form.modules} onChange={(e) => set('modules', parseInt(e.target.value) || 1)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-aud">Audience</Label>
            <Input id="c-aud" value={form.audience} onChange={(e) => set('audience', e.target.value)} placeholder="e.g. All Staff, Clinical Staff" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-url">
              Course Link <span className="text-[10px] font-normal text-muted-foreground">optional — users click this to open the course</span>
            </Label>
            <Input id="c-url" type="url" value={form.courseUrl ?? ''} onChange={(e) => set('courseUrl', e.target.value)} placeholder="https://…" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="c-order">Sort Order</Label>
              <Input id="c-order" type="number" min={0} value={form.sortOrder} onChange={(e) => set('sortOrder', parseInt(e.target.value) || 0)} />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.mandatory}
                  onChange={(e) => set('mandatory', e.target.checked)}
                  className="h-4 w-4 rounded border-input accent-accent"
                />
                <span className="text-sm font-medium">Mandatory</span>
              </label>
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? <span className="flex items-center gap-2"><span className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />{isEdit ? 'Saving…' : 'Creating…'}</span> : isEdit ? 'Save Changes' : 'Create Course'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function CoursesManagePage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalError, setGlobalError] = useState('');
  const [formTarget, setFormTarget] = useState<Course | 'new' | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Course | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setGlobalError('');
    const { courses: data, error } = await getCourses();
    if (error) setGlobalError(error);
    else setCourses(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSaved = (saved: Course) => {
    setCourses((prev) => {
      const idx = prev.findIndex((c) => c.id === saved.id);
      return idx >= 0 ? prev.map((c) => (c.id === saved.id ? saved : c)) : [saved, ...prev];
    });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setActionLoading(deleteTarget.id);
    const { error } = await deleteCourse(deleteTarget.id);
    setActionLoading(null);
    if (error) { setGlobalError(error); setDeleteTarget(null); return; }
    setCourses((prev) => prev.filter((c) => c.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  const levelColor: Record<string, string> = {
    Beginner: 'bg-green-500/15 text-green-700 border-green-400/30',
    Intermediate: 'bg-amber-500/15 text-amber-700 border-amber-400/30',
    Advanced: 'bg-red-500/15 text-red-700 border-red-400/30',
  };

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Courses</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{courses.length} course{courses.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setFormTarget('new')} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Course
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
          <div className="min-w-[580px]">
            {/* Header */}
            <div className="grid grid-cols-[1fr_8rem_7rem_5.5rem_4.5rem] gap-3 px-5 py-2.5 border-b border-border/60 bg-muted/50 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
              <span>Course</span>
              <span className="text-center">Category</span>
              <span className="text-center">Level</span>
              <span className="text-center">Duration</span>
              <span className="text-right">Actions</span>
            </div>
            <CardContent className="p-0">
              {loading ? (
                <div>
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4 px-5 py-3.5 border-b border-border/40 last:border-0">
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3.5 w-2/3 rounded bg-muted animate-pulse" />
                        <div className="h-3 w-1/3 rounded bg-muted animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : courses.length === 0 ? (
                <p className="text-sm text-muted-foreground px-5 py-8 text-center">No courses yet.</p>
              ) : (
                <div>
                  {courses.map((c, idx) => (
                    <div
                      key={c.id}
                      className={`grid grid-cols-[1fr_8rem_7rem_5.5rem_4.5rem] gap-3 items-center px-5 py-3.5 hover:bg-muted/40 transition-colors ${idx < courses.length - 1 ? 'border-b border-border/40' : ''}`}
                    >
                      {/* Course info */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm font-medium text-foreground truncate">{c.title}</p>
                          {c.mandatory && <Badge className="text-[9px] py-0 px-1.5 bg-red-500/15 text-red-700 border-red-400/30 shrink-0">Mandatory</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{c.audience} · {c.modules} module{c.modules !== 1 ? 's' : ''}</p>
                        {c.courseUrl && (
                          <a href={c.courseUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-accent transition-colors mt-0.5">
                            <ExternalLink className="h-2.5 w-2.5" /> Course link
                          </a>
                        )}
                      </div>

                      {/* Category */}
                      <div className="flex justify-center">
                        <Badge variant="secondary" className="text-[10px] max-w-full truncate">{c.category}</Badge>
                      </div>

                      {/* Level */}
                      <div className="flex justify-center">
                        <Badge className={`text-[10px] max-w-full truncate ${levelColor[c.level] ?? ''}`}>{c.level}</Badge>
                      </div>

                      {/* Duration */}
                      <p className="text-xs text-muted-foreground text-center">{c.duration}</p>

                      {/* Actions */}
                      <div className="flex items-center justify-end gap-1">
                        <Button aria-label="Edit course" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => setFormTarget(c)} disabled={actionLoading === c.id}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button aria-label="Delete course" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setDeleteTarget(c)} disabled={actionLoading === c.id}>
                          {actionLoading === c.id
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
        <CourseFormModal
          item={formTarget === 'new' ? undefined : formTarget}
          onClose={() => setFormTarget(null)}
          onSaved={handleSaved}
        />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete course?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>"{deleteTarget?.title}"</strong>. Learning paths referencing this course will lose it. This cannot be undone.
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

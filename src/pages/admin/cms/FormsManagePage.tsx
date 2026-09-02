import { useEffect, useMemo, useState } from 'react';
import {
  CalendarClock,
  ChevronDown,
  ChevronUp,
  Download,
  EyeOff,
  GripVertical,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CmsSearchBar } from '@/components/cms/CmsSearchBar';
import { GENERAL_ENTITY, VISIBILITY_ENTITIES, entityName } from '@/lib/entities';
import {
  createForm,
  deleteForm,
  downloadFormResponses,
  getCmsForms,
  getCmsSessions,
  updateForm,
  type FormInput,
  type FormQuestion,
  type FormQuestionType,
  type LearningForm,
  type LiveSession,
} from '@/services/cmsService';

const QUESTION_TYPES: { value: Exclude<FormQuestionType, 'section'>; label: string }[] = [
  { value: 'choice', label: 'Choice' },
  { value: 'text', label: 'Text' },
  { value: 'rating', label: 'Rating' },
  { value: 'date', label: 'Date' },
  { value: 'ranking', label: 'Ranking' },
  { value: 'likert', label: 'Likert' },
  { value: 'nps', label: 'Net Promoter Score' },
];
const MAX_LINKED_FORMS_PER_SESSION = 2;

function newQuestion(type: FormQuestionType = 'choice'): FormQuestion {
  const id = `q-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const base = { id, type, title: '', required: true };
  if (type === 'choice') return { ...base, options: ['Option 1', 'Option 2'], allowMultiple: false };
  if (type === 'ranking') return { ...base, options: ['Option 1', 'Option 2'] };
  if (type === 'likert') return { ...base, rows: ['Statement 1'], options: ['Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree'] };
  if (type === 'rating') return { ...base, max: 5 };
  if (type === 'text') return { ...base, longAnswer: false };
  if (type === 'section') return { ...base, required: false };
  return base;
}

function applyTypeDefaults(question: FormQuestion, type: FormQuestionType): FormQuestion {
  return { ...newQuestion(type), id: question.id, title: question.title, required: question.required };
}

function toDateTimeLocal(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function defaultEndDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  date.setHours(17, 0, 0, 0);
  return toDateTimeLocal(date.toISOString());
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
}

function formStatus(form: LearningForm): { label: string; className: string } {
  if (form.expired && form.hideWhenExpired) return { label: 'Hidden', className: 'bg-slate-100 text-slate-700 border-slate-300/60' };
  if (form.expired) return { label: 'Expired', className: 'bg-red-100 text-red-700 border-red-300/60' };
  if (form.upcoming) return { label: 'Upcoming', className: 'bg-amber-100 text-amber-700 border-amber-300/60' };
  return { label: 'Open', className: 'bg-emerald-100 text-emerald-700 border-emerald-300/60' };
}

function sessionLabel(session: LiveSession): string {
  return `${session.title} - ${session.date}${session.time ? `, ${session.time}` : ''}`;
}

function listWithUpdatedIndex(values: string[], index: number, nextValue: string): string[] {
  return values.map((value, i) => (i === index ? nextValue : value));
}

interface FormModalProps {
  item?: LearningForm;
  forms: LearningForm[];
  sessions: LiveSession[];
  onClose: () => void;
  onSaved: (item: LearningForm) => void;
}

function FormModal({ item, forms, sessions, onClose, onSaved }: FormModalProps) {
  const isEdit = !!item;
  const sessionOptions = useMemo(
    () => [...sessions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [sessions]
  );
  const linkedCountsBySession = useMemo(() => {
    const counts = new Map<number, number>();
    for (const savedForm of forms) {
      if (!savedForm.liveSessionId || savedForm.id === item?.id) continue;
      counts.set(savedForm.liveSessionId, (counts.get(savedForm.liveSessionId) ?? 0) + 1);
    }
    return counts;
  }, [forms, item?.id]);
  const [form, setForm] = useState<FormInput>({
    title: item?.title ?? '',
    description: item?.description ?? '',
    questions: item?.questions?.length ? item.questions : [newQuestion()],
    entities: item?.entities?.length ? item.entities : [GENERAL_ENTITY],
    liveSessionId: item?.liveSessionId ?? null,
    startsAt: item ? toDateTimeLocal(item.startsAt) : toDateTimeLocal(new Date().toISOString()),
    expiresAt: item ? toDateTimeLocal(item.expiresAt) : defaultEndDate(),
    hideWhenExpired: item?.hideWhenExpired ?? false,
    isAttendance: item?.isAttendance ?? false,
    sortOrder: item?.sortOrder ?? 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [questionTypeToAdd, setQuestionTypeToAdd] = useState('');

  function set<K extends keyof FormInput>(field: K, value: FormInput[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateQuestion(index: number, next: FormQuestion) {
    set('questions', form.questions.map((q, i) => (i === index ? next : q)));
  }

  function addQuestion(type: FormQuestionType = 'choice') {
    set('questions', [...form.questions, newQuestion(type)]);
  }

  function removeQuestion(index: number) {
    if (form.questions.length === 1) {
      setError('An assessment needs at least one question.');
      return;
    }
    set('questions', form.questions.filter((_, i) => i !== index));
  }

  function moveQuestion(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= form.questions.length) return;
    const next = [...form.questions];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    set('questions', next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.entities.length === 0) {
      setError('Select at least one visibility option.');
      return;
    }
    if (!form.startsAt || !form.expiresAt || new Date(form.expiresAt) <= new Date(form.startsAt)) {
      setError('Expiry date must be after the start date.');
      return;
    }

    setLoading(true);
    setError('');
    const payload: FormInput = {
      ...form,
      startsAt: new Date(form.startsAt).toISOString(),
      expiresAt: new Date(form.expiresAt).toISOString(),
      sortOrder: Number(form.sortOrder) || 0,
    };
    const result = isEdit ? await updateForm(item!.id, payload) : await createForm(payload);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    onSaved(result.form!);
    onClose();
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] overflow-y-auto p-4 sm:max-w-3xl sm:p-6">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Assessment' : 'Add Assessment'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 pt-1">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_8rem]">
            <div className="space-y-1.5">
              <Label htmlFor="f-title">Title</Label>
              <Input id="f-title" value={form.title} onChange={(e) => set('title', e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="f-order">Sort Order</Label>
              <Input id="f-order" type="number" min={0} value={form.sortOrder} onChange={(e) => set('sortOrder', parseInt(e.target.value) || 0)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="f-desc">Card Description</Label>
            <Textarea id="f-desc" rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="f-live-session">Placement</Label>
            <Select
              value={form.liveSessionId ? String(form.liveSessionId) : 'standalone'}
              onValueChange={(value) => {
                if (value === 'no-sessions') return;
                set('liveSessionId', value === 'standalone' ? null : Number(value));
              }}
            >
              <SelectTrigger id="f-live-session">
                <SelectValue placeholder="Select placement" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standalone">Standalone - show as Learning Centre card</SelectItem>
                {sessionOptions.length === 0 && (
                  <SelectItem value="no-sessions" disabled>No live sessions available</SelectItem>
                )}
                {sessionOptions.map((session) => {
                  const linkedCount = linkedCountsBySession.get(session.id) ?? 0;
                  const isFull = linkedCount >= MAX_LINKED_FORMS_PER_SESSION;
                  return (
                    <SelectItem key={session.id} value={String(session.id)} disabled={isFull}>
                      <span className="block truncate">
                        Link to session: {sessionLabel(session)} ({linkedCount}/{MAX_LINKED_FORMS_PER_SESSION} linked)
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Choose a live session to show this under that session. Each session can have up to two linked forms.
            </p>
          </div>

          <label className="flex cursor-pointer select-none items-start gap-2 rounded-md border border-input px-3 py-2.5">
            <Checkbox
              className="mt-0.5"
              checked={form.isAttendance}
              onCheckedChange={(value) => set('isAttendance', Boolean(value))}
            />
            <span className="min-w-0 text-sm text-foreground">
              Attendance form
              <span className="block text-xs text-muted-foreground">
                When linked to a live session, the session card button will show "Mark Attendance".
              </span>
            </span>
          </label>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="f-start">Start Date</Label>
              <Input id="f-start" type="datetime-local" value={form.startsAt} onChange={(e) => set('startsAt', e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="f-expiry">Expiry Date</Label>
              <Input id="f-expiry" type="datetime-local" value={form.expiresAt} onChange={(e) => set('expiresAt', e.target.value)} required />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Visibility</Label>
            <div className="grid gap-2 rounded-md border border-input px-3 py-2.5 sm:grid-cols-2">
              {VISIBILITY_ENTITIES.map((entity) => {
                const checked = form.entities.includes(entity.id);
                return (
                  <label key={entity.id} htmlFor={`f-entity-${entity.id}`} className="flex cursor-pointer select-none items-center gap-2.5">
                    <Checkbox
                      id={`f-entity-${entity.id}`}
                      checked={checked}
                      onCheckedChange={(value) =>
                        set('entities', value ? [...form.entities, entity.id] : form.entities.filter((id) => id !== entity.id))
                      }
                    />
                    <span className="text-sm text-foreground">
                      {entity.name}
                      {entity.id === GENERAL_ENTITY && <span className="text-muted-foreground"> (visible to everyone)</span>}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <label className="flex cursor-pointer select-none items-center gap-2 rounded-md border border-input px-3 py-2.5">
            <Checkbox
              checked={form.hideWhenExpired}
              onCheckedChange={(value) => set('hideWhenExpired', Boolean(value))}
            />
            <span className="text-sm text-foreground">Not visible on Learning Centre after expiry</span>
          </label>

          <div className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <Label>Questions</Label>
              <Select
                value={questionTypeToAdd}
                onValueChange={(value) => {
                  addQuestion(value as FormQuestionType);
                  setQuestionTypeToAdd('');
                }}
              >
                <SelectTrigger className="w-full sm:w-56">
                  <SelectValue placeholder="Add question" />
                </SelectTrigger>
                <SelectContent>
                  {QUESTION_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              {form.questions.map((question, index) => (
                <QuestionEditor
                  key={question.id}
                  question={question}
                  index={index}
                  isFirst={index === 0}
                  isLast={index === form.questions.length - 1}
                  onChange={(next) => updateQuestion(index, next)}
                  onRemove={() => removeQuestion(index)}
                  onMove={moveQuestion}
                />
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="w-full sm:w-auto" disabled={loading}>
              {loading ? <span className="flex items-center gap-2"><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />Saving...</span> : isEdit ? 'Save Changes' : 'Create Assessment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface QuestionEditorProps {
  question: FormQuestion;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  onChange: (question: FormQuestion) => void;
  onRemove: () => void;
  onMove: (index: number, direction: -1 | 1) => void;
}

function QuestionEditor({ question, index, isFirst, isLast, onChange, onRemove, onMove }: QuestionEditorProps) {
  const options = question.options ?? [];
  const rows = question.rows ?? [];

  function setField<K extends keyof FormQuestion>(field: K, value: FormQuestion[K]) {
    onChange({ ...question, [field]: value });
  }

  return (
    <Card className="border-border/60">
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="flex items-center gap-1 text-muted-foreground">
            <GripVertical className="h-4 w-4" />
            <span className="text-xs font-semibold">{index + 1}</span>
          </div>
          <div className="grid min-w-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-[1fr_11rem]">
            <Input value={question.title} onChange={(e) => setField('title', e.target.value)} placeholder="Question" required />
            <Select value={question.type} onValueChange={(value) => onChange(applyTypeDefaults(question, value as FormQuestionType))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {QUESTION_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1">
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => onMove(index, -1)} disabled={isFirst} aria-label="Move question up">
              <ChevronUp className="h-3.5 w-3.5" />
            </Button>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => onMove(index, 1)} disabled={isLast} aria-label="Move question down">
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={onRemove} aria-label="Remove question">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {(question.type === 'choice' || question.type === 'ranking') && (
          <OptionList
            label={question.type === 'choice' ? 'Options' : 'Ranking Options'}
            values={options}
            onChange={(next) => setField('options', next)}
          />
        )}

        {question.type === 'choice' && (
          <label className="flex cursor-pointer select-none items-center gap-2">
            <Checkbox checked={!!question.allowMultiple} onCheckedChange={(value) => setField('allowMultiple', Boolean(value))} />
            <span className="text-sm">Allow multiple answers</span>
          </label>
        )}

        {question.type === 'text' && (
          <label className="flex cursor-pointer select-none items-center gap-2">
            <Checkbox checked={!!question.longAnswer} onCheckedChange={(value) => setField('longAnswer', Boolean(value))} />
            <span className="text-sm">Long answer</span>
          </label>
        )}

        {question.type === 'rating' && (
          <div className="max-w-40 space-y-1.5">
            <Label>Scale</Label>
            <Input type="number" min={2} max={10} value={question.max ?? 5} onChange={(e) => setField('max', parseInt(e.target.value) || 5)} />
          </div>
        )}

        {question.type === 'likert' && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <OptionList label="Statements" values={rows} onChange={(next) => setField('rows', next)} />
            <OptionList label="Scale Options" values={options} onChange={(next) => setField('options', next)} />
          </div>
        )}

        {question.type === 'nps' && (
          <div className="grid grid-cols-6 gap-1 sm:grid-cols-11">
            {Array.from({ length: 11 }, (_, score) => (
              <div key={score} className="rounded border border-border bg-muted/40 py-1 text-center text-xs text-muted-foreground">{score}</div>
            ))}
          </div>
        )}

        {question.type !== 'section' && (
          <label className="flex cursor-pointer select-none items-center gap-2 border-t border-border pt-3">
            <Checkbox checked={question.required} onCheckedChange={(value) => setField('required', Boolean(value))} />
            <span className="text-sm">Required</span>
          </label>
        )}
      </CardContent>
    </Card>
  );
}

function OptionList({ label, values, onChange }: { label: string; values: string[]; onChange: (values: string[]) => void }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="space-y-2">
        {values.map((value, index) => (
          <div key={index} className="flex items-center gap-2">
            <Input className="min-w-0 flex-1" value={value} onChange={(e) => onChange(listWithUpdatedIndex(values, index, e.target.value))} />
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => onChange(values.filter((_, i) => i !== index))} aria-label={`Remove ${label.toLowerCase()}`}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
      <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => onChange([...values, `${label.replace(/s$/, '')} ${values.length + 1}`])}>
        <Plus className="h-3.5 w-3.5" />
        Add
      </Button>
    </div>
  );
}

export default function FormsManagePage() {
  const [forms, setForms] = useState<LearningForm[]>([]);
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalError, setGlobalError] = useState('');
  const [formTarget, setFormTarget] = useState<LearningForm | 'new' | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LearningForm | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const sessionById = useMemo(() => new Map(sessions.map((session) => [session.id, session])), [sessions]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return forms;
    return forms.filter((form) => {
      const linkedSession = form.liveSessionId ? sessionById.get(form.liveSessionId) : null;
      const placement = form.liveSessionId
        ? form.isAttendance
          ? 'attendance linked session mark attendance'
          : 'assessment linked session take assessment'
        : 'standalone learning centre assessment';
      return (
        form.title.toLowerCase().includes(q) ||
        form.description.toLowerCase().includes(q) ||
        form.entities.some((entity) => entityName(entity).toLowerCase().includes(q)) ||
        formStatus(form).label.toLowerCase().includes(q) ||
        placement.includes(q) ||
        !!linkedSession?.title.toLowerCase().includes(q)
      );
    });
  }, [forms, search, sessionById]);

  const load = async () => {
    setLoading(true);
    setGlobalError('');
    const [formsResult, sessionsResult] = await Promise.all([getCmsForms(), getCmsSessions()]);
    if (formsResult.error) setGlobalError(formsResult.error);
    else setForms(formsResult.forms ?? []);
    if (sessionsResult.error) setGlobalError((current) => current || sessionsResult.error || '');
    else setSessions(sessionsResult.sessions ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  function handleSaved(saved: LearningForm) {
    setForms((current) => {
      const exists = current.some((form) => form.id === saved.id);
      return exists ? current.map((form) => (form.id === saved.id ? saved : form)) : [...current, saved];
    });
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setActionLoading(deleteTarget.id);
    const { error } = await deleteForm(deleteTarget.id);
    setActionLoading(null);
    if (error) {
      setGlobalError(error);
      setDeleteTarget(null);
      return;
    }
    setForms((current) => current.filter((form) => form.id !== deleteTarget.id));
    setDeleteTarget(null);
  }

  async function handleExport(form: LearningForm) {
    setActionLoading(form.id);
    const { error } = await downloadFormResponses(form.id);
    setActionLoading(null);
    if (error) setGlobalError(error);
  }

  async function toggleHiddenExpired(form: LearningForm, hideWhenExpired: boolean) {
    setActionLoading(form.id);
    const { form: saved, error } = await updateForm(form.id, { hideWhenExpired });
    setActionLoading(null);
    if (error) {
      setGlobalError(error);
      return;
    }
    if (saved) handleSaved(saved);
  }

  return (
    <div className="max-w-6xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Assessments</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{forms.length} assessment{forms.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setFormTarget('new')} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Assessment
          </Button>
        </div>
      </div>

      <CmsSearchBar value={search} onChange={setSearch} placeholder="Search assessments by title, visibility, or status..." />

      {globalError && (
        <div className="flex items-center justify-between rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {globalError}
          <button type="button" aria-label="Dismiss error" onClick={() => setGlobalError('')}><X className="h-3.5 w-3.5" /></button>
        </div>
      )}

      <Card className="overflow-hidden border-border/60">
        <div className="overflow-x-auto">
          <div className="min-w-[980px]">
            <div className="grid grid-cols-[1fr_9rem_9rem_8rem_9rem_12rem_7rem] gap-3 border-b border-border/60 bg-muted/50 px-5 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              <span>Assessment</span>
              <span className="text-center">Placement</span>
              <span className="text-center">Visibility</span>
              <span className="text-center">Status</span>
              <span className="text-center">Responses</span>
              <span className="text-center">Window</span>
              <span className="text-right">Actions</span>
            </div>
            <CardContent className="p-0">
              {loading ? (
                <div>
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4 border-b border-border/40 px-5 py-3.5 last:border-0">
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3.5 w-2/3 animate-pulse rounded bg-muted" />
                        <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-muted-foreground">
                  {forms.length === 0 ? 'No assessments created. Click "Add Assessment" to create one.' : 'No assessments match your search.'}
                </p>
              ) : (
                <div>
                  {filtered.map((form, index) => {
                    const status = formStatus(form);
                    const linkedSession = form.liveSessionId ? sessionById.get(form.liveSessionId) : null;
                    return (
                      <div
                        key={form.id}
                        className={`grid grid-cols-[1fr_9rem_9rem_8rem_9rem_12rem_7rem] items-center gap-3 px-5 py-3.5 transition-colors hover:bg-muted/40 ${index < filtered.length - 1 ? 'border-b border-border/40' : ''}`}
                      >
                        <div className="min-w-0">
                          <div className="flex min-w-0 items-center gap-2">
                            <p className="truncate text-sm font-medium text-foreground">{form.title}</p>
                            {form.isAttendance && <Badge variant="outline" className="shrink-0 px-1.5 py-0 text-[9px]">Attendance</Badge>}
                          </div>
                          <p className="truncate text-xs text-muted-foreground">{form.description || `${form.questions?.length ?? form.questionCount ?? 0} questions`}</p>
                        </div>
                        <div className="min-w-0 text-center">
                          <Badge variant={form.liveSessionId ? 'default' : 'outline'} className="text-[10px]">
                            {form.liveSessionId ? (form.isAttendance ? 'Attendance' : 'Assessment') : 'Standalone'}
                          </Badge>
                          {form.liveSessionId && (
                            <p className="mt-1 truncate text-[10px] text-muted-foreground" title={linkedSession?.title ?? 'Linked session'}>
                              {linkedSession?.title ?? 'Linked session'}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-wrap justify-center gap-1">
                          {form.entities.slice(0, 2).map((entity) => (
                            <Badge key={entity} variant={entity === GENERAL_ENTITY ? 'default' : 'secondary'} className="max-w-full truncate px-1.5 py-0 text-[9px]">
                              {entityName(entity)}
                            </Badge>
                          ))}
                          {form.entities.length > 2 && <Badge variant="outline" className="px-1.5 py-0 text-[9px]">+{form.entities.length - 2}</Badge>}
                        </div>
                        <div className="flex flex-col items-center gap-1">
                          <Badge className={`inline-flex items-center gap-1 text-[10px] ${status.className}`}>
                            {form.expired && form.hideWhenExpired ? <EyeOff className="h-3 w-3" /> : <CalendarClock className="h-3 w-3" />}
                            {status.label}
                          </Badge>
                          {form.expired && (
                            <label className="flex items-center gap-1 text-[10px] text-muted-foreground">
                              <Checkbox
                                className="h-3.5 w-3.5"
                                checked={form.hideWhenExpired}
                                disabled={actionLoading === form.id}
                                onCheckedChange={(value) => toggleHiddenExpired(form, Boolean(value))}
                              />
                              Not visible
                            </label>
                          )}
                        </div>
                        <div className="text-center text-sm font-medium text-foreground">{form.responseCount}</div>
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">{formatDateTime(form.startsAt)}</p>
                          <p className="text-xs text-muted-foreground/60">{formatDateTime(form.expiresAt)}</p>
                        </div>
                        <div className="flex items-center justify-end gap-1">
                          <Button aria-label="Export responses" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => handleExport(form)} disabled={actionLoading === form.id}>
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                          <Button aria-label="Edit assessment" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => setFormTarget(form)} disabled={actionLoading === form.id}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button aria-label="Delete assessment" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setDeleteTarget(form)} disabled={actionLoading === form.id}>
                            {actionLoading === form.id ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <Trash2 className="h-3.5 w-3.5" />}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </div>
        </div>
      </Card>

      {formTarget !== null && (
        <FormModal
          item={formTarget === 'new' ? undefined : formTarget}
          forms={forms}
          sessions={sessions}
          onClose={() => setFormTarget(null)}
          onSaved={handleSaved}
        />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete assessment?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete <strong>"{deleteTarget?.title}"</strong>. Existing responses will no longer be available from the CMS.
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

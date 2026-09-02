import { Fragment, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileQuestion,
  Send,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent } from '@/components/ui/card';
import { Seo } from '@/components/Seo';
import { useAuth } from '@/contexts/AuthContext';
import { getForm, submitForm, type FormQuestion, type LearningForm } from '@/services/cmsService';

type AnswerMap = Record<string, unknown>;

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
}

function initializeAnswers(form: LearningForm): AnswerMap {
  const answers: AnswerMap = {};
  for (const question of form.questions ?? []) {
    if (question.type === 'ranking') answers[question.id] = [...(question.options ?? [])];
    if (question.type === 'likert') answers[question.id] = {};
    if (question.type === 'choice' && question.allowMultiple) answers[question.id] = [];
  }
  return answers;
}

function QuestionField({
  question,
  value,
  onChange,
}: {
  question: FormQuestion;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const options = question.options ?? [];

  if (question.type === 'section') return null;

  if (question.type === 'choice' && question.allowMultiple) {
    const selected = Array.isArray(value) ? value.map(String) : [];
    return (
      <div className="space-y-2">
        {options.map((option) => (
          <label key={option} className="flex cursor-pointer items-start gap-2 rounded-md border border-border px-3 py-2">
            <Checkbox
              className="mt-0.5 shrink-0"
              checked={selected.includes(option)}
              onCheckedChange={(checked) => {
                onChange(checked ? [...selected, option] : selected.filter((item) => item !== option));
              }}
            />
            <span className="min-w-0 break-words text-sm text-foreground">{option}</span>
          </label>
        ))}
      </div>
    );
  }

  if (question.type === 'choice') {
    return (
      <RadioGroup value={typeof value === 'string' ? value : ''} onValueChange={onChange}>
        {options.map((option) => (
          <label key={option} className="flex cursor-pointer items-start gap-2 rounded-md border border-border px-3 py-2">
            <RadioGroupItem value={option} className="mt-0.5 shrink-0" />
            <span className="min-w-0 break-words text-sm text-foreground">{option}</span>
          </label>
        ))}
      </RadioGroup>
    );
  }

  if (question.type === 'text') {
    if (question.longAnswer) {
      return <Textarea rows={5} value={typeof value === 'string' ? value : ''} onChange={(e) => onChange(e.target.value)} />;
    }
    return <Input value={typeof value === 'string' ? value : ''} onChange={(e) => onChange(e.target.value)} />;
  }

  if (question.type === 'rating') {
    const max = question.max ?? 5;
    const selected = Number(value);
    return (
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: max }, (_, i) => i + 1).map((rating) => (
          <Button
            key={rating}
            type="button"
            variant={selected === rating ? 'default' : 'outline'}
            className="h-10 w-10 p-0"
            onClick={() => onChange(rating)}
          >
            {rating}
          </Button>
        ))}
      </div>
    );
  }

  if (question.type === 'date') {
    return <Input type="date" value={typeof value === 'string' ? value : ''} onChange={(e) => onChange(e.target.value)} />;
  }

  if (question.type === 'ranking') {
    const ranked = Array.isArray(value) ? value.map(String) : [...options];
    const move = (index: number, direction: -1 | 1) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= ranked.length) return;
      const next = [...ranked];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      onChange(next);
    };
    return (
      <div className="space-y-2">
        {ranked.map((option, index) => (
          <div key={option} className="grid grid-cols-[2rem_minmax(0,1fr)_4.5rem] items-center gap-2 rounded-md border border-border px-3 py-2">
            <span className="text-center text-xs font-semibold text-muted-foreground">{index + 1}</span>
            <span className="min-w-0 break-words text-sm text-foreground">{option}</span>
            <div className="flex justify-end gap-1">
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Move up">
                <ChevronUp className="h-3.5 w-3.5" />
              </Button>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => move(index, 1)} disabled={index === ranked.length - 1} aria-label="Move down">
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (question.type === 'likert') {
    const rows = question.rows ?? [];
    const answers = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, string> : {};
    return (
      <div>
        <div className="space-y-3 sm:hidden">
          {rows.map((row) => (
            <div key={row} className="rounded-md border border-border p-3">
              <p className="mb-2 break-words text-sm font-medium text-foreground">{row}</p>
              <RadioGroup value={answers[row] ?? ''} onValueChange={(next) => onChange({ ...answers, [row]: next })}>
                {options.map((option) => (
                  <label key={`${row}-${option}`} className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5">
                    <RadioGroupItem value={option} className="mt-0.5 shrink-0" />
                    <span className="min-w-0 break-words text-sm text-muted-foreground">{option}</span>
                  </label>
                ))}
              </RadioGroup>
            </div>
          ))}
        </div>
        <div className="hidden overflow-x-auto rounded-md border border-border sm:block">
          <div className="min-w-[620px]">
          <div className="grid" style={{ gridTemplateColumns: `minmax(12rem,1fr) repeat(${options.length}, minmax(7rem, 8rem))` }}>
            <div className="border-b border-border bg-muted/50 px-3 py-2 text-xs font-semibold text-muted-foreground">Statement</div>
            {options.map((option) => (
              <div key={option} className="border-b border-border bg-muted/50 px-2 py-2 text-center text-xs font-semibold text-muted-foreground">{option}</div>
            ))}
            {rows.map((row) => (
              <Fragment key={row}>
                <div className="border-b border-border px-3 py-3 text-sm text-foreground">{row}</div>
                {options.map((option) => (
                  <label key={`${row}-${option}`} className="flex items-center justify-center border-b border-border px-2 py-3">
                    <RadioGroup value={answers[row] ?? ''} onValueChange={(next) => onChange({ ...answers, [row]: next })}>
                      <RadioGroupItem value={option} aria-label={`${row}: ${option}`} />
                    </RadioGroup>
                  </label>
                ))}
              </Fragment>
            ))}
          </div>
        </div>
        </div>
      </div>
    );
  }

  if (question.type === 'nps') {
    const selected = Number(value);
    return (
      <div className="grid grid-cols-6 gap-2 sm:grid-cols-11">
        {Array.from({ length: 11 }, (_, score) => (
          <Button
            key={score}
            type="button"
            variant={selected === score ? 'default' : 'outline'}
            className="h-10 p-0"
            onClick={() => onChange(score)}
          >
            {score}
          </Button>
        ))}
      </div>
    );
  }

  return null;
}

export default function LearningFormPage() {
  const params = useParams();
  const { user } = useAuth();
  const [form, setForm] = useState<LearningForm | null>(null);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const formId = Number(params.id);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!Number.isFinite(formId)) {
        setError('Assessment not found.');
        setLoading(false);
        return;
      }
      setLoading(true);
      const { form: data, error: loadError } = await getForm(formId);
      if (cancelled) return;
      if (loadError || !data) {
        setError(loadError ?? 'Assessment not found.');
      } else {
        setForm(data);
        setAnswers(initializeAnswers(data));
      }
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [formId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form || form.expired || form.upcoming || form.hasSubmitted || submitted) return;
    setSubmitting(true);
    setError('');
    const { error: submitError } = await submitForm(form.id, answers);
    setSubmitting(false);
    if (submitError) {
      setError(submitError);
      return;
    }
    setSubmitted(true);
    setForm({ ...form, hasSubmitted: true });
  }

  const title = form?.title ?? 'Learning Assessment';
  const isBlocked = !!form && (form.expired || form.upcoming || form.hasSubmitted || submitted);

  return (
    <>
      <Seo title={title} description={form?.description ?? 'Learning Centre assessment'} path={`/learning/forms/${params.id ?? ''}`} />
      <section className="border-b border-border bg-learning-header px-6 py-10 sm:px-8 lg:px-16">
        <div className="mx-auto max-w-3xl">
          <Link to="/learning" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-white/70 transition-colors hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            Learning Centre
          </Link>
          <p className="mb-2 font-sans text-xs font-medium uppercase tracking-[0.2em] text-accent">Assessment</p>
          <h1 className="break-words text-2xl font-bold text-white sm:text-3xl">{title}</h1>
          {form?.description && <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/65">{form.description}</p>}
        </div>
      </section>

      <section className="px-6 py-10 sm:px-8 lg:px-16">
        <div className="mx-auto max-w-3xl">
          {loading ? (
            <Card className="border-border/60">
              <CardContent className="space-y-3 p-6">
                <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
                <div className="h-20 animate-pulse rounded bg-muted" />
              </CardContent>
            </Card>
          ) : !form ? (
            <Card className="border-border/60">
              <CardContent className="p-6 text-sm text-muted-foreground">{error || 'Assessment not found.'}</CardContent>
            </Card>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarClock className="h-4 w-4" />
                  <span className="min-w-0 break-words">Open until {formatDateTime(form.expiresAt)}</span>
                </div>
                <div className="break-all text-sm text-muted-foreground">{user?.email}</div>
              </div>

              {(form.expired || form.upcoming || form.hasSubmitted || submitted) && (
                <Card className="border-border/60">
                  <CardContent className="flex items-start gap-3 p-5">
                    {form.hasSubmitted || submitted ? (
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                    ) : (
                      <FileQuestion className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                    )}
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {form.hasSubmitted || submitted ? 'Response submitted' : form.expired ? 'This assessment has expired' : 'This assessment is not open yet'}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {form.hasSubmitted || submitted
                          ? 'Each user can submit this assessment once.'
                          : form.expired
                            ? `The submission window closed on ${formatDateTime(form.expiresAt)} and this assessment can no longer be filled.`
                            : `The submission window opens on ${formatDateTime(form.startsAt)}.`}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {!isBlocked && (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {(form.questions ?? []).map((question, index) => {
                    if (question.type === 'section') {
                      return (
                        <div key={question.id} className="border-b border-border pb-3 pt-2">
                          <h2 className="text-lg font-bold text-foreground">{question.title}</h2>
                        </div>
                      );
                    }
                    return (
                      <Card key={question.id} className="border-border/60">
                        <CardContent className="space-y-4 p-4 sm:p-5">
                          <div>
                            <Label className="break-words text-base font-semibold text-foreground">
                              {index + 1}. {question.title}
                              {question.required && <span className="ml-1 text-destructive">*</span>}
                            </Label>
                          </div>
                          <QuestionField
                            question={question}
                            value={answers[question.id]}
                            onChange={(value) => setAnswers((current) => ({ ...current, [question.id]: value }))}
                          />
                        </CardContent>
                      </Card>
                    );
                  })}

                  {error && <p className="text-sm text-destructive">{error}</p>}

                  <div className="flex justify-end">
                    <Button type="submit" disabled={submitting} className="w-full gap-2 sm:w-auto">
                      {submitting ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <Send className="h-4 w-4" />}
                      Submit
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </section>
    </>
  );
}

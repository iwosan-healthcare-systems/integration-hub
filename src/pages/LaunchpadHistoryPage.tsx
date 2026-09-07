import { Seo } from '@/components/Seo';
import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Lightbulb, ArrowUpRight, Clock3, CalendarDays, Wallet, Send, CircleX, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LaunchpadShell, StatusBadge, IdeaDetails, LoadError, SubmitLink, dateTime, money } from '@/components/launchpad/LaunchpadShared';
import { LaunchpadReveal } from '@/components/launchpad/LaunchpadMotion';
import { getMyIdeas, type IdeaStatus } from '@/services/launchpadService';

const statusStyle = {
  submitted: { icon: Send, color: 'text-blue-600 dark:text-blue-300', background: 'bg-blue-500/10', border: 'border-l-blue-400', label: 'Submitted' },
  under_review: { icon: Clock3, color: 'text-amber-600 dark:text-amber-300', background: 'bg-amber-500/10', border: 'border-l-amber-400', label: 'Under Review' },
  successful: { icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-300', background: 'bg-emerald-500/10', border: 'border-l-emerald-400', label: 'Successful' },
  rejected: { icon: CircleX, color: 'text-rose-600 dark:text-rose-300', background: 'bg-rose-500/10', border: 'border-l-rose-400', label: 'Rejected' },
};

export default function LaunchpadHistoryPage() {
  const { user } = useAuth();
  const location = useLocation();
  const [selected, setSelected] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<IdeaStatus | null>(null);
  const result = useQuery({ queryKey: ['launchpad', user?.id, 'mine'], queryFn: getMyIdeas, refetchInterval: 30000 });
  const submitted = (location.state as { submitted?: string } | null)?.submitted;
  const ideas = result.data?.submissions ?? [];
  const filteredIdeas = statusFilter ? ideas.filter(idea => idea.status === statusFilter) : ideas;

  return <LaunchpadShell>
    <Seo title="My submissions | LaunchPad" path="/launchpad/history" description="Track and review LaunchPad ideas." />
    <header className="lp-enter relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-primary/90 p-6 sm:p-9 text-primary-foreground">
      <div aria-hidden="true" className="absolute -right-12 -top-16 h-64 w-64 rounded-full border-[35px] border-white/5" />
      <div className="relative flex flex-col sm:flex-row justify-between gap-6 sm:items-center"><div><p className="flex items-center gap-2 text-xs uppercase tracking-widest text-cyan-200 font-semibold mb-4"><Sparkles className="h-4 w-4" /> Your ideas in motion</p><h1 className="text-3xl sm:text-4xl font-bold">My submissions</h1><p className="text-white/75 mt-3 max-w-lg leading-relaxed">Every idea you have shared, and where it stands. Keep track of your progress and find your next starting point.</p></div></div>
    </header>

    {submitted && <div role="status" className="lp-enter flex items-start gap-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-5"><span className="rounded-full bg-emerald-500/15 p-2"><CheckCircle2 className="h-5 w-5 text-emerald-600" /></span><div><p className="font-semibold">Your idea is on its way.</p><p className="text-sm text-muted-foreground mt-1">Submitted successfully. Reference: <strong className="text-foreground">{submitted}</strong>.</p></div></div>}
    {result.isPending && <div role="status" className="rounded-2xl border p-8 text-center text-muted-foreground">Loading your submissions…</div>}
    {result.error && <LoadError error={result.error} retry={() => result.refetch()} />}

    {result.data && <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{(Object.keys(statusStyle) as IdeaStatus[]).map((status, i) => {
        const style = statusStyle[status];
        return <LaunchpadReveal key={status} delay={i * 55}><button type="button" aria-pressed={statusFilter === status} aria-controls="idea-collection" aria-label={`Filter by ${style.label}`} onClick={() => setStatusFilter(current => current === status ? null : status)} className={`w-full rounded-2xl border p-4 sm:p-5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${statusFilter === status ? 'border-accent bg-accent/5 ring-2 ring-accent/30' : 'bg-card hover:border-accent/50 hover:bg-accent/5'}`}><div className="flex justify-between items-center gap-2"><span className={`inline-flex rounded-xl p-2.5 ${style.background} ${style.color}`}><style.icon className="h-4 w-4" /></span><span className="text-3xl font-bold">{ideas.filter(s => s.status === status).length}</span></div><p className="text-xs text-muted-foreground mt-4">{style.label}</p></button></LaunchpadReveal>;
      })}</div>
      {ideas.length === 0 && !statusFilter ? <LaunchpadReveal><div id="idea-collection" className="relative overflow-hidden rounded-3xl border border-dashed border-accent/30 bg-gradient-to-b from-accent/5 to-card p-8 sm:p-14 text-center space-y-5"><span className="inline-flex rounded-3xl bg-accent/10 p-5 ring-8 ring-accent/5"><Lightbulb className="h-10 w-10 text-accent" /></span><h2 className="text-2xl font-bold">A small idea can start something good.</h2><p className="text-muted-foreground max-w-md mx-auto leading-relaxed">You haven’t submitted an idea yet. Think of one thing that could make the day better for your patients or colleagues.</p><SubmitLink /></div></LaunchpadReveal> : <section id="idea-collection" className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">Your idea collection</h2><div className="flex flex-wrap items-center gap-2"><span role="status" className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">{statusFilter ? `${statusStyle[statusFilter].label}: ` : ''}{filteredIdeas.length} {filteredIdeas.length === 1 ? 'idea' : 'ideas'}</span>{statusFilter && <Button size="sm" variant="ghost" onClick={() => setStatusFilter(null)}>Show all</Button>}</div></div>
        {filteredIdeas.length === 0 && <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">No {statusFilter ? statusStyle[statusFilter].label.toLowerCase() : ''} ideas to show.</p>}
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{filteredIdeas.map((s, i) => {
          const style = statusStyle[s.status];
          return <LaunchpadReveal key={s.id} delay={(i % 2) * 70} className="h-full"><article className={`lp-card h-full flex flex-col rounded-2xl border border-l-4 ${style.border} bg-card p-4`}>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3"><span className="font-mono text-xs tracking-wider text-muted-foreground">{s.reference}</span><StatusBadge status={s.status} /></div>
            <div className="flex gap-3 items-start"><span className={`rounded-lg p-2 shrink-0 ${style.background} ${style.color}`}><Lightbulb className="h-4 w-4" /></span><h3 className="font-semibold text-sm leading-relaxed line-clamp-2 break-words">{s.answers.idea}</h3></div>
            <div className="flex flex-wrap gap-1.5 my-3">{s.answers.values.map(value => <span key={value} className="rounded-full bg-accent/5 border border-accent/15 px-2.5 py-1 text-[10px] font-medium">{value}</span>)}</div>
            <div className="mt-auto flex flex-wrap items-center justify-between gap-2 text-[10px] text-muted-foreground"><span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />{dateTime(s.submittedAt)}</span><span className="inline-flex items-center gap-1.5 font-semibold text-foreground"><Wallet className="h-3.5 w-3.5 text-muted-foreground" />{money(s.answers.funding)}</span></div>
            <div className="border-t mt-3 pt-2 flex justify-end"><Button size="sm" variant="ghost" className="h-8 text-xs text-accent hover:text-accent hover:bg-accent/10 px-2" onClick={() => setSelected(s.id)}>View submission<ArrowUpRight className="ml-1.5 h-3.5 w-3.5" /></Button></div>
          </article></LaunchpadReveal>;
        })}</div>
      </section>}
    </>}
    <IdeaDetails id={selected} onClose={() => setSelected(null)} />
  </LaunchpadShell>;
}

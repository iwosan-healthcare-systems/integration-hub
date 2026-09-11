import { Link, NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Rocket, ArrowUpRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { entityName } from '@/lib/entities';
import { getIdea, LAUNCHPAD_STATUSES, type IdeaStatus } from '@/services/launchpadService';
export const money = (amount: number) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 2 }).format(amount);
export const dateTime = (value: string) => new Date(value).toLocaleString('en-GB', { timeZone: 'Africa/Lagos', dateStyle: 'medium', timeStyle: 'short' });
export function StatusBadge({ status }: { status: IdeaStatus }) {
  const colors = { submitted: 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30', under_review: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30', successful: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30', rejected: 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30' };
  return <Badge variant="outline" className={`self-start shrink-0 whitespace-nowrap ${colors[status]}`}>{LAUNCHPAD_STATUSES[status]}</Badge>;
}
export function LaunchpadShell({ children, panel = false }: { children: React.ReactNode; panel?: boolean }) {
  const { user } = useAuth();
  const reviewer = user?.role === 'user' && user.canReviewLaunchpad;
  return <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-9 space-y-7">
    <div className="flex items-center gap-3"><span className="rounded-2xl bg-accent/10 p-3 text-accent"><Rocket className="h-6 w-6" /></span><div><span className="font-display text-2xl font-bold">{panel ? 'LaunchPad' : <Link to="/launchpad">LaunchPad</Link>}</span><p className="text-sm text-muted-foreground">Your idea. Your ownership. Our support.</p></div></div>
    {!panel && <nav aria-label="LaunchPad navigation" className="flex flex-wrap gap-2 border-b pb-4">
      {[['/launchpad','Overview'],['/launchpad/history','My submissions'],...(reviewer ? [['/launchpad/review','Review dashboard']] : [])].map(([to,label]) => <NavLink key={to} to={to} end className={({isActive}) => `rounded-full px-4 py-2 text-sm font-medium transition-colors ${isActive ? 'bg-primary text-primary-foreground' : 'bg-muted/60 hover:bg-muted'}`}>{label}</NavLink>)}
    </nav>}{children}
  </div>;
}
export function LoadError({ error, retry }: { error: Error; retry: () => void }) { return <div role="alert" className="rounded-xl border border-destructive/30 p-5 space-y-3"><p>{error.message}</p><Button variant="outline" onClick={retry}>Try again</Button></div>; }
export function IdeaDetails({ id, onClose }: { id: number | null; onClose: () => void }) {
  const { user } = useAuth();
  const detail = useQuery({ queryKey: ['launchpad', user?.id, 'detail', id], queryFn: () => getIdea(id!), enabled: id !== null, refetchInterval: 30000 });
  const s = detail.data?.submission; const a = s?.answers;
  return <Dialog open={id !== null} onOpenChange={open => { if (!open) onClose(); }}><DialogContent className="max-w-3xl max-h-[90dvh] overflow-y-auto">
    <DialogHeader><DialogTitle>{s?.reference ?? 'Submission details'}</DialogTitle><DialogDescription>Idea response and status history. Times are shown in Lagos time.</DialogDescription></DialogHeader>
    {detail.isPending && <p role="status">Loading submission…</p>}
    {detail.error && <LoadError error={detail.error} retry={() => detail.refetch()} />}
    {s && a && <div className="space-y-6"><div className="flex flex-wrap items-center gap-3"><StatusBadge status={s.status} /><span className="text-sm text-muted-foreground">{dateTime(s.submittedAt)}</span></div>
      <dl className="grid sm:grid-cols-2 gap-4 rounded-xl bg-muted/50 p-4">{[['Name',s.userName],['Email',s.userEmail],['Entity',entityName(s.userEntity)],['Department',a.department],['Line manager',a.managerName],['Manager email',a.managerEmail]].map(([label,value])=><div key={label} className="min-w-0"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="break-words text-sm font-medium">{value}</dd></div>)}</dl>
      <dl className="space-y-5">{[['The problem and who it affects',a.problem],['What would you like to change?',a.idea],['Iwosan values',a.values.join(', ')],...(a.testPlan ? [['Where and with whom will you test it? (original response)',a.testPlan]] : []),['How will you test out this idea?',a.testMethod || 'Not collected on the original form'],['Who will you be working with to test out this idea?',a.testTeam || 'Not collected on the original form'],['Funding requested',money(a.funding)],['Pilot dates',`${a.startDate} to ${a.endDate}`],['How will you know it worked?',a.measurement],['What could prevent the pilot from working?',a.risks || 'Not provided'],['Pilot owner',a.owner],['Line manager support',a.managerSupported ? 'Yes' : 'No']].map(([label,value])=><div key={label}><dt className="font-semibold text-sm mb-1">{label}</dt><dd className="whitespace-pre-wrap break-words text-sm text-muted-foreground">{value}</dd></div>)}</dl>
      <section className="border-t pt-4"><h3 className="font-semibold mb-3">Status history</h3><ol className="space-y-3">{detail.data.history.map((h,i)=><li key={i} className="flex flex-wrap gap-3 items-center text-sm"><StatusBadge status={h.status}/><span>{dateTime(h.changedAt)}</span></li>)}</ol></section>
    </div>}
  </DialogContent></Dialog>;
}
export function SubmitLink() { return <Button asChild size="lg" className="rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25 hover:from-cyan-400 hover:to-blue-500 motion-safe:transition-all motion-safe:hover:-translate-y-0.5"><Link to="/launchpad/submit">Submit an idea <ArrowUpRight className="ml-2 h-4 w-4" /></Link></Button>; }

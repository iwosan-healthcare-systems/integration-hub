import { LaunchpadReviewCharts } from '@/components/launchpad/LaunchpadReviewCharts';
import { Seo } from '@/components/Seo';
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ENTITIES, entityName } from '@/lib/entities';
import { LaunchpadShell, StatusBadge, IdeaDetails, LoadError, dateTime, money } from '@/components/launchpad/LaunchpadShared';
import { getReview, changeIdeaStatus, exportIdeas, LAUNCHPAD_STATUSES, type IdeaStatus, type IdeaSubmission, type ReviewFilters } from '@/services/launchpadService';
const empty: ReviewFilters={status:'',entity:'',from:'',to:'',search:''};
const selectClass='flex h-8 w-full rounded-md border border-input bg-background px-3 py-2 text-sm';
function StatusEditor({ submission, onSaved }: { submission: IdeaSubmission; onSaved: () => Promise<void> }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const canSelect = (next: IdeaStatus) => isAdmin || next === submission.status || submission.status === 'submitted' || (submission.status === 'under_review' && (next === 'successful' || next === 'rejected'));
  const locked = !isAdmin && (submission.status === 'successful' || submission.status === 'rejected');
  const [status,setStatus]=useState<IdeaStatus>(submission.status); const [busy,setBusy]=useState(false);
  const save=async()=>{ if (!canSelect(status) || status === submission.status) return; setBusy(true); try { await changeIdeaStatus(submission.id,status,submission.version); toast.success('Status updated'); await onSaved(); } catch(e) { toast.error(e instanceof Error?e.message:'Could not update status'); await onSaved(); } finally {setBusy(false);} };
  return <div className="space-y-1.5"><div className="flex gap-2"><select aria-label={`Status for ${submission.reference}`} className={`${selectClass} min-w-36`} value={status} onChange={e=>{ const next = e.target.value as IdeaStatus; if (canSelect(next)) setStatus(next); }} disabled={busy || locked}>{Object.entries(LAUNCHPAD_STATUSES).map(([key,label])=><option key={key} value={key} disabled={!canSelect(key as IdeaStatus)}>{label}</option>)}</select><Button size="sm" className="h-8" disabled={busy || !canSelect(status) || status===submission.status} onClick={save}>{busy?'Saving...':'Save'}</Button></div>{!isAdmin && submission.status !== 'submitted' && <p className="text-xs text-muted-foreground">{locked ? 'Only an admin can change a final decision.' : 'Only an admin can revert a status.'}</p>}</div>;
}
export default function LaunchpadReviewPage({ panel = false }: { panel?: boolean }) {
  const {user}=useAuth();
  const panelUser = user?.role === 'admin' || user?.role === 'manager';
  const allowed = panel ? panelUser : user?.role === 'user' && user.canReviewLaunchpad;
  const client=useQueryClient();
  const [draft,setDraft]=useState<ReviewFilters>(empty); const [filters,setFilters]=useState<ReviewFilters>(empty); const [page,setPage]=useState(1); const [selected,setSelected]=useState<number|null>(null); const [exporting,setExporting]=useState(false);
  const result=useQuery({queryKey:['launchpad',user?.id,'review',filters,page],queryFn:({signal})=>getReview(filters,page,signal),placeholderData:keepPreviousData,enabled:!!allowed,refetchInterval:30000});
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters(current => current.search === draft.search ? current : {...current, search: draft.search});
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [draft.search]);
  const applyField = (field: 'entity' | 'from' | 'to', value: string) => {
    const next = {...draft, [field]: value};
    setDraft(next);
    if (next.from && next.to && next.from > next.to) return;
    setFilters(current => ({...current, entity: next.entity, from: next.from, to: next.to}));
    setPage(1);
  };
  const selectStatus = (status: string) => {
    const next = filters.status === status ? '' : status;
    setFilters(current => ({...current, status: next}));
    setDraft(current => ({...current, status: next}));
    setPage(1);
  };
  const refresh=async()=>{await client.invalidateQueries({queryKey:['launchpad']});};
  const download=async()=>{setExporting(true);try{await exportIdeas(filters);}catch(e){toast.error(e instanceof Error?e.message:'Export failed');}finally{setExporting(false);}};
  if(!allowed) return <Navigate to={panelUser ? "/admin/launchpad" : "/launchpad"} replace/>;
  return <LaunchpadShell panel={panel}><Seo title="Review dashboard | LaunchPad" path={panel ? "/admin/launchpad" : "/launchpad/review"} description="Track and review LaunchPad ideas." /><header className="flex flex-wrap gap-4 items-start justify-between"><div><h1 className="font-display text-3xl font-bold">Review dashboard</h1><p className="text-muted-foreground mt-2">Ideas from across Iwosan, in one place.</p></div><div className="flex gap-2"><Button variant="outline" aria-label="Refresh submissions" onClick={()=>refresh()} disabled={result.isFetching}><RefreshCw className={`h-4 w-4 ${result.isFetching?'animate-spin':''}`}/></Button><Button onClick={download} disabled={exporting||result.isPending||!!result.error}><Download className="h-4 w-4 mr-2"/>{exporting?'Exporting…':'Export CSV'}</Button></div></header>

    {result.isPending && <p role="status">Loading dashboard…</p>}{result.error && <LoadError error={result.error} retry={()=>result.refetch()}/>}
    {result.data && <>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2" aria-label="Filter submissions by status">
        {[['','All submissions'],...Object.entries(LAUNCHPAD_STATUSES)].map(([key,label]) => <button type="button" key={key} aria-pressed={filters.status===key} aria-controls="review-submissions" onClick={()=>selectStatus(key)} className={`rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${filters.status===key ? 'border-accent bg-accent/10 ring-1 ring-accent/30' : 'bg-card hover:border-accent/50 hover:bg-accent/5'}`}><span className="block text-[11px] text-muted-foreground">{label}</span><span className="block text-2xl font-bold mt-1">{key ? result.data.statusSummary[key as IdeaStatus] : Object.values(result.data.statusSummary).reduce((sum,count)=>sum+count,0)}</span></button>)}
      </div>
      <LaunchpadReviewCharts data={result.data} status={filters.status} />
    </>}
    <form className="rounded-xl border bg-muted/20 p-3 space-y-2" onSubmit={e=>{e.preventDefault();setFilters({...draft, status: filters.status});setPage(1);}}>
      <div className="grid grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] gap-2 items-end">
        <div className="col-span-2 lg:col-span-1 space-y-1"><Label className="text-[11px]" htmlFor="review-search">Search</Label><Input className="h-8 text-xs" id="review-search" placeholder="Name, email, reference or idea" maxLength={200} value={draft.search} onChange={e=>setDraft({...draft,search:e.target.value})}/></div>
        <div className="col-span-2 lg:col-span-1 space-y-1"><Label className="text-[11px]" htmlFor="review-entity">Entity</Label><select id="review-entity" className="h-8 w-full min-w-0 rounded-md border border-input bg-background px-2 text-xs" value={draft.entity} onChange={e=>applyField('entity',e.target.value)}><option value="">All entities</option>{ENTITIES.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}<option value="unassigned">Unassigned</option></select></div>
        <div className="min-w-0 space-y-1"><Label className="text-[11px]" htmlFor="review-from">Submitted from</Label><Input className="h-8 min-w-0 px-2 text-xs" id="review-from" type="date" value={draft.from} onChange={e=>applyField('from',e.target.value)}/></div>
        <div className="min-w-0 space-y-1"><Label className="text-[11px]" htmlFor="review-to">Submitted to</Label><Input className="h-8 min-w-0 px-2 text-xs" id="review-to" type="date" min={draft.from||undefined} value={draft.to} onChange={e=>applyField('to',e.target.value)}/></div>
        <div className="col-span-2 lg:col-span-1 flex gap-1.5"><Button className="h-8 px-3 text-xs" type="submit">Apply filters</Button><Button className="h-8 px-3 text-xs" type="button" variant="outline" onClick={()=>{setDraft(empty);setFilters(empty);setPage(1);}}>Clear</Button></div>
      </div>
      <p className="text-[10px] text-muted-foreground">Search updates as you type. Entity and dates apply automatically. Dates include the full end date in Lagos time. Select a status card above to filter responses and exports.</p>
    </form>
    {result.data && <>
      <section id="review-submissions" className="space-y-4"><h2 className="text-lg font-semibold">Submissions <span className="text-muted-foreground font-normal">({result.data.total}{filters.status ? ` - ${LAUNCHPAD_STATUSES[filters.status as IdeaStatus]}` : ''})</span></h2>{!result.data.submissions.length && <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">No submissions match these filters.</p>}
      {result.isFetching && <p role="status" className="text-xs text-muted-foreground">Updating results...</p>}
      <div className="space-y-2" aria-busy={result.isFetching}>{result.data.submissions.map(s=><article key={s.id} className="rounded-xl border bg-card p-3 sm:p-4 transition-colors hover:border-accent/40 hover:bg-muted/30">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2"><button className="text-xs font-semibold text-accent hover:underline" onClick={()=>setSelected(s.id)}>{s.reference}</button><StatusBadge status={s.status}/><span className="text-[10px] text-muted-foreground">{dateTime(s.submittedAt)}</span></div>
            <button className="block text-left text-sm font-semibold line-clamp-2 break-words hover:text-accent" onClick={()=>setSelected(s.id)}>{s.answers.idea}</button>
            <p className="text-xs text-muted-foreground truncate" title={s.userEmail}><span className="font-medium text-foreground">{s.userName}</span> / {entityName(s.userEntity)} / {s.answers.department} / {money(s.answers.funding)}</p>
          </div>
          <div className="flex flex-wrap items-start gap-2 shrink-0"><Button size="sm" className="h-8 text-xs" variant="outline" onClick={()=>setSelected(s.id)}>View response</Button><StatusEditor key={`${s.id}-${s.version}`} submission={s} onSaved={refresh}/></div>
        </div>
      </article>)}</div>
      <div className="flex justify-between items-center gap-3"><Button variant="outline" disabled={page===1||result.isPlaceholderData} onClick={()=>setPage(p=>p-1)}>Previous</Button><span className="text-sm text-muted-foreground">Page {page} of {Math.max(1,Math.ceil(result.data.total/result.data.pageSize))}</span><Button variant="outline" disabled={result.isPlaceholderData||page*result.data.pageSize>=result.data.total} onClick={()=>setPage(p=>p+1)}>Next</Button></div></section></>}
    <IdeaDetails id={selected} onClose={()=>setSelected(null)}/>
  </LaunchpadShell>;
}

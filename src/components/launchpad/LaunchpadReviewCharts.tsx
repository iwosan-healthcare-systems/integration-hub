import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { LAUNCHPAD_STATUSES, type ReviewResult, type IdeaStatus } from '@/services/launchpadService';
import { ENTITIES, entityName } from '@/lib/entities';

const statusColors: Record<IdeaStatus, string> = { submitted: '#3b82f6', under_review: '#f59e0b', successful: '#10b981', rejected: '#f43f5e' };
const entityColors = ['#06b6d4', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#64748b'];
const tooltipStyle = { background: 'hsl(var(--popover))', color: 'hsl(var(--popover-foreground))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 12 };

export function LaunchpadReviewCharts({ data, status }: { data: ReviewResult; status: string }) {
  const statuses = Object.entries(LAUNCHPAD_STATUSES).map(([key,name]) => ({ name, count: data.statusSummary[key as IdeaStatus], color: statusColors[key as IdeaStatus] }));
  const entities = data.entitySummary.map(row => {
    const index = ENTITIES.findIndex(entity => entity.id === row.entity);
    return { name: entityName(row.entity), count: row.count, color: entityColors[index >= 0 ? index % entityColors.length : entityColors.length - 1] };
  });
  const statusTotal = statuses.reduce((sum,row) => sum + row.count, 0);
  return <div className="grid lg:grid-cols-2 gap-4">
    <section aria-labelledby="status-chart-title" className="min-w-0 rounded-2xl border bg-card p-4 sm:p-5">
      <h2 id="status-chart-title" className="font-semibold text-sm">Ideas by status</h2>
      <p className="text-xs text-muted-foreground mt-1 mb-4">All statuses for the applied date, entity and search filters.</p>
      {statusTotal ? <><div className="h-56" role="img" aria-label={statuses.map(row => `${row.name}: ${row.count}`).join(', ')}><ResponsiveContainer width="100%" height="100%">
        <BarChart data={statuses} layout="vertical" margin={{ top: 5, right: 20, bottom: 0, left: 0 }} accessibilityLayer>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
          <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'hsl(var(--muted) / .5)' }} />
          <Bar dataKey="count" name="Ideas" barSize={22} radius={[0, 5, 5, 0]} isAnimationActive={false}>{statuses.map(row => <Cell key={row.name} fill={row.color} />)}</Bar>
        </BarChart>
      </ResponsiveContainer></div><p className="text-xs text-muted-foreground mt-2">{statusTotal} ideas across all statuses</p></> : <p className="h-56 flex items-center justify-center text-sm text-muted-foreground">No status data for these filters.</p>}
    </section>
    <section aria-labelledby="entity-chart-title" className="min-w-0 rounded-2xl border bg-card p-4 sm:p-5">
      <h2 id="entity-chart-title" className="font-semibold text-sm">Ideas by entity</h2>
      <p className="text-xs text-muted-foreground mt-1 mb-4">{status ? LAUNCHPAD_STATUSES[status as IdeaStatus] : 'All statuses'} · All matching responses, across every page.</p>
      {entities.length ? <><div className="h-48" role="img" aria-label={entities.map(row => `${row.name}: ${row.count}`).join(', ')}><ResponsiveContainer width="100%" height="100%">
        <PieChart><Pie data={entities} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={80} stroke="hsl(var(--card))" strokeWidth={3} isAnimationActive={false}>{entities.map(row => <Cell key={row.name} fill={row.color} />)}</Pie><Tooltip contentStyle={tooltipStyle} /></PieChart>
      </ResponsiveContainer></div><ul className="grid sm:grid-cols-2 gap-x-4 gap-y-2 mt-2">{entities.map(row => <li key={row.name} className="flex items-center gap-2 text-xs"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: row.color }} /><span className="text-muted-foreground">{row.name}</span><span className="ml-auto font-semibold">{row.count}</span></li>)}</ul></> : <p className="h-56 flex items-center justify-center text-sm text-muted-foreground">No entity data for these filters.</p>}
    </section>
  </div>;
}

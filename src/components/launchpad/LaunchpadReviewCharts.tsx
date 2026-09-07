import { useState } from 'react';
import { ChartPie, ChartColumn } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { LAUNCHPAD_STATUSES, type ReviewResult, type IdeaStatus } from '@/services/launchpadService';
import { ENTITIES, entityName } from '@/lib/entities';

const statusColors: Record<IdeaStatus, string> = { submitted: '#3b82f6', under_review: '#f59e0b', successful: '#10b981', rejected: '#f43f5e' };
const entityColors = ['#06b6d4', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#64748b'];
const tooltipStyle = { background: 'hsl(var(--popover))', color: 'hsl(var(--popover-foreground))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 12 };
type ChartRow = { name: string; count: number; color: string };

function ReviewChart({ id, title, description, rows, initialType }: {
  id: string; title: string; description: string; rows: ChartRow[]; initialType: 'pie' | 'bar';
}) {
  const [type, setType] = useState(initialType);
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  return <section aria-labelledby={id + '-title'} className="min-w-0 rounded-2xl border bg-card p-4 sm:p-5">
    <div className="flex items-center justify-between gap-3">
      <h2 id={id + '-title'} className="font-semibold text-sm">{title}</h2>
      <div role="group" aria-label={title + ' chart type'} className="flex shrink-0 overflow-hidden rounded-lg border">
        {([{ value: 'pie', label: 'Pie chart', Icon: ChartPie }, { value: 'bar', label: 'Bar chart', Icon: ChartColumn }] as const).map(({ value, label, Icon }) =>
          <button key={value} type="button" title={label} aria-label={label} aria-pressed={type === value} aria-controls={id + '-plot'} onClick={() => setType(value)}
            className={'p-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent ' + (type === value ? 'bg-cyan-500 text-white' : 'bg-background text-muted-foreground hover:bg-muted')}>
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          </button>)}
      </div>
    </div>
    <p className="text-xs text-muted-foreground mt-1 mb-4">{description}</p>
    {total ? <>
      <div id={id + '-plot'} className="h-56" role="img" aria-label={type + ' chart. ' + rows.map(row => `${row.name}: ${row.count}`).join(', ')}>
        <ResponsiveContainer width="100%" height="100%">
          {type === 'bar' ?
            <BarChart data={rows} layout="vertical" margin={{ top: 5, right: 20, bottom: 0, left: 0 }} accessibilityLayer>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'hsl(var(--muted) / .5)' }} />
              <Bar dataKey="count" name="Ideas" barSize={22} radius={[0, 5, 5, 0]} isAnimationActive={false}>{rows.map(row => <Cell key={row.name} fill={row.color} />)}</Bar>
            </BarChart> :
            <PieChart>
              <Pie data={rows.filter(row => row.count > 0)} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={90} stroke="hsl(var(--card))" strokeWidth={3} isAnimationActive={false}>{rows.filter(row => row.count > 0).map(row => <Cell key={row.name} fill={row.color} />)}</Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>}
        </ResponsiveContainer>
      </div>
      <ul className="grid sm:grid-cols-2 gap-x-4 gap-y-2 mt-3">{rows.map(row => <li key={row.name} className="flex items-center gap-2 text-xs"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: row.color }} /><span className="text-muted-foreground">{row.name}</span><span className="ml-auto font-semibold">{row.count}</span></li>)}</ul>
    </> : <p id={id + '-plot'} className="h-56 flex items-center justify-center text-sm text-muted-foreground">No data for these filters.</p>}
  </section>;
}

export function LaunchpadReviewCharts({ data, status }: { data: ReviewResult; status: string }) {
  const statuses = Object.entries(LAUNCHPAD_STATUSES).map(([key, name]) => ({ name, count: data.statusSummary[key as IdeaStatus], color: statusColors[key as IdeaStatus] }));
  const entities = data.entitySummary.map(row => {
    const index = ENTITIES.findIndex(entity => entity.id === row.entity);
    return { name: entityName(row.entity), count: row.count, color: entityColors[index >= 0 ? index % entityColors.length : entityColors.length - 1] };
  });
  return <div className="grid lg:grid-cols-2 gap-4">
    <ReviewChart id="status-chart" title="Ideas by status" description="All statuses for the applied date, entity and search filters." rows={statuses} initialType="bar" />
    <ReviewChart id="entity-chart" title="Ideas by entity" description={(status ? LAUNCHPAD_STATUSES[status as IdeaStatus] : 'All statuses') + ' - All matching responses, across every page.'} rows={entities} initialType="pie" />
  </div>;
}

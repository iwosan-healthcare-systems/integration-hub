import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, UserCheck, UserX, Shield, ArrowRight, RefreshCw, Clock3,
  Newspaper, GraduationCap, Route, Video, Image as ImageIcon, CalendarClock,
} from 'lucide-react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent,
} from '@/components/ui/chart';
import { listUsers, type AdminUser } from '@/services/authService';
import {
  getNews, getCourses, getLearningPaths, getSessions, getPictureLibrary,
  type NewsItem, type Course, type LearningPath, type LiveSession, type PictureLibraryItem,
} from '@/services/cmsService';

function roleBadge(role: string) {
  if (role === 'admin') return <Badge className="bg-accent/20 text-accent border-accent/30 text-[10px]">Admin</Badge>;
  if (role === 'manager') return <Badge className="bg-blue-500/20 text-blue-600 border-blue-400/30 text-[10px]">Manager</Badge>;
  return <Badge variant="secondary" className="text-[10px]">User</Badge>;
}

// Fixed hue order, validated for CVD-safe adjacent-pair separation in both
// light and dark modes (see dataviz skill's reference palette).
const roleChartConfig = {
  user: { label: 'User', theme: { light: '#2a78d6', dark: '#3987e5' } },
  manager: { label: 'Manager', theme: { light: '#eb6834', dark: '#d95926' } },
  admin: { label: 'Admin', theme: { light: '#1baf7a', dark: '#199e70' } },
} satisfies ChartConfig;

const growthChartConfig = {
  count: { label: 'New Users', theme: { light: '#2a78d6', dark: '#3987e5' } },
} satisfies ChartConfig;

const cmsChartConfig = {
  count: { label: 'Items', theme: { light: '#2a78d6', dark: '#3987e5' } },
} satisfies ChartConfig;

function monthBuckets(n: number) {
  const now = new Date();
  const buckets: { key: string; label: string }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString('en-GB', { month: 'short' }) });
  }
  return buckets;
}

export default function AdminDashboard() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [learningPaths, setLearningPaths] = useState<LearningPath[]>([]);
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [pictures, setPictures] = useState<PictureLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    const [u, n, c, lp, s, p] = await Promise.all([
      listUsers(), getNews(), getCourses(), getLearningPaths(), getSessions(), getPictureLibrary(),
    ]);
    const firstError = u.error || n.error || c.error || lp.error || s.error || p.error;
    if (firstError) setError(firstError);
    setUsers(u.users ?? []);
    setNews(n.news ?? []);
    setCourses(c.courses ?? []);
    setLearningPaths(lp.learningPaths ?? []);
    setSessions(s.sessions ?? []);
    setPictures(p.pictures ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const total = users.length;
  const active = users.filter((u) => u.isActive).length;
  const inactive = users.filter((u) => !u.isActive).length;
  const pending = users.filter((u) => u.isFirstLogin && u.authProvider !== 'azure').length;
  const managers = users.filter((u) => u.role === 'manager').length;
  const admins = users.filter((u) => u.role === 'admin').length;
  const recent = users.slice(0, 5);

  const userStats = [
    { label: 'Total Users', value: total, icon: Users, color: 'text-foreground', bg: 'bg-muted' },
    { label: 'Active', value: active, icon: UserCheck, color: 'text-green-600', bg: 'bg-green-500/10' },
    { label: 'Inactive', value: inactive, icon: UserX, color: 'text-destructive', bg: 'bg-destructive/10' },
    { label: 'Pending Login', value: pending, icon: Clock3, color: 'text-amber-600', bg: 'bg-amber-500/10' },
    { label: 'Managers', value: managers, icon: Shield, color: 'text-blue-600', bg: 'bg-blue-500/10' },
    { label: 'Admins', value: admins, icon: Shield, color: 'text-accent', bg: 'bg-accent/10' },
  ];

  const cmsStats = [
    { label: 'News Articles', value: news.length, icon: Newspaper, color: 'text-blue-600', bg: 'bg-blue-500/10' },
    { label: 'Courses', value: courses.length, icon: GraduationCap, color: 'text-accent', bg: 'bg-accent/10' },
    { label: 'Learning Paths', value: learningPaths.length, icon: Route, color: 'text-green-600', bg: 'bg-green-500/10' },
    { label: 'Live Sessions', value: sessions.length, icon: Video, color: 'text-purple-600', bg: 'bg-purple-500/10' },
    { label: 'Picture Albums', value: pictures.length, icon: ImageIcon, color: 'text-amber-600', bg: 'bg-amber-500/10' },
  ];

  const growthData = useMemo(() => {
    const buckets = monthBuckets(6);
    const counts = new Map(buckets.map((b) => [b.key, 0]));
    users.forEach((u) => {
      const d = new Date(u.createdAt);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return buckets.map((b) => ({ month: b.label, count: counts.get(b.key) ?? 0 }));
  }, [users]);

  const roleData = useMemo(() => ([
    { key: 'user', role: 'User', count: users.filter((u) => u.role === 'user').length, fill: 'var(--color-user)' },
    { key: 'manager', role: 'Manager', count: managers, fill: 'var(--color-manager)' },
    { key: 'admin', role: 'Admin', count: admins, fill: 'var(--color-admin)' },
  ]), [users, managers, admins]);

  const cmsData = useMemo(() => ([
    { type: 'News', count: news.length },
    { type: 'Courses', count: courses.length },
    { type: 'Paths', count: learningPaths.length },
    { type: 'Sessions', count: sessions.length },
    { type: 'Pictures', count: pictures.length },
  ]), [news, courses, learningPaths, sessions, pictures]);

  const upcomingSessions = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    return sessions
      .map((s) => ({ ...s, dateObj: new Date(s.date) }))
      .filter((s) => !isNaN(s.dateObj.getTime()) && s.dateObj >= startOfToday)
      .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())
      .slice(0, 5);
  }, [sessions]);

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Overview</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Iwosan Integration Hub — users &amp; content analytics</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* ── User analytics ─────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">User Analytics</h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {userStats.map(({ label, value, icon: Icon, color, bg }) => (
            <Card key={label} className="border-border/60">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
                  <div className={`h-8 w-8 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
                    <Icon className={`h-4 w-4 ${color}`} />
                  </div>
                </div>
                <p className={`text-2xl font-bold ${color}`}>{loading ? '—' : value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="border-border/60 lg:col-span-2">
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className="text-sm font-semibold">User Growth</CardTitle>
              <p className="text-xs text-muted-foreground">New signups over the last 6 months</p>
            </CardHeader>
            <CardContent className="px-5 pb-4">
              <ChartContainer config={growthChartConfig} className="aspect-auto h-56 w-full">
                <AreaChart data={growthData} margin={{ left: -20, right: 8, top: 8 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis tickLine={false} axisLine={false} tickMargin={8} width={32} allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                  <Area
                    dataKey="count"
                    type="monotone"
                    fill="var(--color-count)"
                    fillOpacity={0.18}
                    stroke="var(--color-count)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className="text-sm font-semibold">Role Distribution</CardTitle>
              <p className="text-xs text-muted-foreground">Accounts by assigned role</p>
            </CardHeader>
            <CardContent className="px-5 pb-4">
              <ChartContainer config={roleChartConfig} className="aspect-auto h-56 w-full">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="role" />} />
                  <Pie data={roleData} dataKey="count" nameKey="role" innerRadius={45} outerRadius={70} strokeWidth={2}>
                    {roleData.map((entry) => (
                      <Cell key={entry.key} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartLegend content={<ChartLegendContent nameKey="role" />} />
                </PieChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        {/* Recent users */}
        <Card className="border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-3 pt-4 px-5">
            <CardTitle className="text-sm font-semibold">Recent Users</CardTitle>
            <Link to="/admin/users">
              <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-accent hover:text-accent">
                View all <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-10 rounded-lg bg-muted animate-pulse" />
                ))}
              </div>
            ) : recent.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No users found.</p>
            ) : (
              <div className="space-y-1">
                {recent.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-muted/60 transition-colors"
                  >
                    <div className="h-8 w-8 rounded-full bg-accent/10 flex items-center justify-center shrink-0 text-accent font-semibold text-sm">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{u.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {roleBadge(u.role)}
                      {!u.isActive && (
                        <Badge variant="destructive" className="text-[10px]">Inactive</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ── CMS analytics ──────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Content (CMS) Analytics</h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {cmsStats.map(({ label, value, icon: Icon, color, bg }) => (
            <Card key={label} className="border-border/60">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
                  <div className={`h-8 w-8 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
                    <Icon className={`h-4 w-4 ${color}`} />
                  </div>
                </div>
                <p className={`text-2xl font-bold ${color}`}>{loading ? '—' : value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="border-border/60 lg:col-span-2">
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className="text-sm font-semibold">Content Library Mix</CardTitle>
              <p className="text-xs text-muted-foreground">Published items by content type</p>
            </CardHeader>
            <CardContent className="px-5 pb-4">
              <ChartContainer config={cmsChartConfig} className="aspect-auto h-56 w-full">
                <BarChart data={cmsData} margin={{ left: -20, right: 8, top: 8 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="type" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis tickLine={false} axisLine={false} tickMargin={8} width={32} allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                  <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader className="flex flex-row items-center justify-between pb-3 pt-4 px-5">
              <CardTitle className="text-sm font-semibold">Upcoming Sessions</CardTitle>
              <Link to="/admin/cms/sessions">
                <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-accent hover:text-accent">
                  View all <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="px-5 pb-4">
              {loading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-10 rounded-lg bg-muted animate-pulse" />
                  ))}
                </div>
              ) : upcomingSessions.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No upcoming sessions.</p>
              ) : (
                <div className="space-y-1">
                  {upcomingSessions.map((s) => (
                    <div key={s.id} className="flex items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-muted/60 transition-colors">
                      <div className="h-8 w-8 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0 text-purple-600">
                        <CalendarClock className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{s.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{s.date} · {s.time}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0">{s.format}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

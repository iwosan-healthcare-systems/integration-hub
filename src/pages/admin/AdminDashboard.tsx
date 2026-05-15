import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, UserCheck, UserX, Shield, ArrowRight, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { listUsers, type AdminUser } from '@/services/authService';

function roleBadge(role: string) {
  if (role === 'admin') return <Badge className="bg-accent/20 text-accent border-accent/30 text-[10px]">Admin</Badge>;
  if (role === 'manager') return <Badge className="bg-blue-500/20 text-blue-600 border-blue-400/30 text-[10px]">Manager</Badge>;
  return <Badge variant="secondary" className="text-[10px]">User</Badge>;
}

export default function AdminDashboard() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    const { users: data, error: err } = await listUsers();
    if (err) setError(err);
    else setUsers(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const total = users.length;
  const active = users.filter((u) => u.isActive).length;
  const inactive = users.filter((u) => !u.isActive).length;
  const admins = users.filter((u) => u.role === 'admin').length;
  const recent = users.slice(0, 5);

  const stats = [
    { label: 'Total Users', value: total, icon: Users, color: 'text-foreground', bg: 'bg-muted' },
    { label: 'Active', value: active, icon: UserCheck, color: 'text-green-600', bg: 'bg-green-500/10' },
    { label: 'Inactive', value: inactive, icon: UserX, color: 'text-destructive', bg: 'bg-destructive/10' },
    { label: 'Admins', value: admins, icon: Shield, color: 'text-accent', bg: 'bg-accent/10' },
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Overview</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Iwosan Innovation Hub User Statistics</p>
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

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="border-border/60">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
                <div className={`h-8 w-8 rounded-lg ${bg} flex items-center justify-center`}>
                  <Icon className={`h-4 w-4 ${color}`} />
                </div>
              </div>
              <p className={`text-2xl font-bold ${color}`}>{loading ? '—' : value}</p>
            </CardContent>
          </Card>
        ))}
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
    </div>
  );
}

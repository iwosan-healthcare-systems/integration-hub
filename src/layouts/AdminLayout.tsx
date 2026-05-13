import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, LogOut, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import iwosanIcon from '@/assets/iwosan_icon.webp';

const navItems = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/users', label: 'Users', icon: Users, end: false },
];

export function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="h-screen flex w-full overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 flex flex-col border-r border-border/60 bg-muted/30">
        {/* Brand */}
        <div className="h-16 flex items-center gap-3 px-5 border-b border-border/60">
          <img src={iwosanIcon} alt="Iwosan" className="h-7 w-auto" />
          <div className="min-w-0">
            <p className="text-xs font-bold text-foreground leading-tight truncate">Iwosan Hub</p>
            <p className="text-[10px] text-accent font-semibold uppercase tracking-widest">Admin Panel</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User info + logout */}
        <div className="px-3 py-4 border-t border-border/60 space-y-3">
          <div className="flex items-center gap-3 px-3">
            <div className="h-8 w-8 rounded-full bg-accent/15 flex items-center justify-center shrink-0">
              <Shield className="h-4 w-4 text-accent" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">{user?.name}</p>
              <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 flex items-center justify-between px-6 border-b border-border/60 bg-background/90 backdrop-blur-md shrink-0">
          <h1 className="text-sm font-semibold text-foreground">Admin Control Panel</h1>
          <span className="text-xs text-muted-foreground">Iwosan Innovation Hub</span>
        </header>
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

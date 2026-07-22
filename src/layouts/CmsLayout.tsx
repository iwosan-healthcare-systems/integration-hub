import { useState, useCallback } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Newspaper, BookOpen, CalendarDays, GraduationCap, Images, LogOut, PenSquare, Menu, X, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ModeToggle } from '@/components/ModeToggle';
import { useAuth } from '@/contexts/AuthContext';
import { clearAzureSession } from '@/services/authService';
import { useInactivityLogout } from '@/hooks/useInactivityLogout';
import iwosanIcon from '@/assets/iwosan_icon.webp';

const cmsItems = [
  { to: '/cms/news', label: 'News', icon: Newspaper },
  { to: '/cms/courses', label: 'Courses', icon: BookOpen },
  { to: '/cms/sessions', label: 'Sessions', icon: CalendarDays },
  { to: '/cms/learning-paths', label: 'Learning Paths', icon: GraduationCap },
  { to: '/cms/picture-library', label: 'Picture Library', icon: Images },
];

function SidebarContent({
  onNavClick,
  onLogout,
}: {
  onNavClick: () => void;
  onLogout: () => void;
}) {
  const { user } = useAuth();

  return (
    <>
      {/* Brand */}
      <div className="h-16 flex items-center gap-3 px-5 border-b border-border/60 shrink-0">
        <img src={iwosanIcon} alt="Iwosan" className="h-7 w-auto" />
        <div className="min-w-0">
          <p className="text-xs font-bold text-foreground leading-tight truncate">Iwosan Integration Hub</p>
          <p className="text-[10px] text-accent font-semibold uppercase tracking-widest">Content Manager</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {cmsItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavClick}
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

        <div className="pt-2">
          <NavLink
            to="/"
            onClick={onNavClick}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            Back to Hub
          </NavLink>
        </div>
      </nav>

      {/* User info + logout */}
      <div className="px-3 py-4 border-t border-border/60 space-y-3 shrink-0">
        <div className="flex items-center gap-3 px-3">
          <div className="h-8 w-8 rounded-full bg-accent/15 flex items-center justify-center shrink-0">
            <PenSquare className="h-4 w-4 text-accent" />
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
          onClick={onLogout}
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </>
  );
}

export function CmsLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleInactivityTimeout = useCallback(async () => {
    if (user?.authProvider === 'azure') await clearAzureSession();
    logout();
    navigate('/login');
    toast.info('You were logged out after 1 hour of inactivity.');
  }, [user, logout, navigate]);

  useInactivityLogout(handleInactivityTimeout, user?.authProvider === 'azure');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="h-screen flex w-full overflow-hidden bg-background">

      {/* ── Desktop sidebar (md+) ── */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-border/60 bg-muted/30">
        <SidebarContent onNavClick={() => {}} onLogout={handleLogout} />
      </aside>

      {/* ── Mobile sidebar overlay ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col w-72 bg-background border-r border-border/60 transition-transform duration-300 md:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button
          type="button"
          onClick={closeSidebar}
          className="absolute top-4 right-4 h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Close menu"
        >
          <X className="h-4 w-4" />
        </button>
        <SidebarContent onNavClick={closeSidebar} onLogout={handleLogout} />
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top header */}
        <header className="h-16 flex items-center justify-between px-4 md:px-6 border-b border-border/60 bg-background/90 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="md:hidden h-9 w-9 text-muted-foreground hover:text-foreground"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-xs text-muted-foreground">Iwosan Integration Hub</span>
            <ModeToggle />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

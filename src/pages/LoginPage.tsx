import { useRef, useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ChevronDown, Eye, EyeOff, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { loginUser, loginWithAzure } from '@/services/authService';
import { AZURE_ORGS } from '@/lib/msalConfig';
import iwosanVideo from '@/assets/iwosan_motion_video.mp4';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

const MicrosoftLogo = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 21 21" width="16" height="16" aria-hidden="true" className="shrink-0">
    <rect x="1" y="1" width="9" height="9" fill="#f25022" />
    <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
    <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
    <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
  </svg>
);

export default function LoginPage() {
  const { user, loading, setUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [azureLoadingOrg, setAzureLoadingOrg] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);

  // Ensure video plays as soon as it's ready — no waiting on user gesture
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.play().catch(() => {});
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  if (!loading && user) {
    const dest = user.role === 'admin' ? '/admin' : (from === '/admin' ? '/' : from);
    return <Navigate to={dest} replace />;
  }

  const onSubmit = async (data: LoginForm) => {
    setServerError('');
    setIsSubmitting(true);
    try {
      const { user: loggedInUser, error } = await loginUser(data.email, data.password);
      if (error || !loggedInUser) {
        setServerError(error || 'Login failed. Please try again.');
        return;
      }
      setUser(loggedInUser);
      const dest = loggedInUser.role === 'admin' ? '/admin' : (from === '/admin' ? '/' : from);
      navigate(dest, { replace: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAzureLogin = async (orgId: string) => {
    setServerError('');
    setAzureLoadingOrg(orgId);
    try {
      const { user: loggedInUser, error } = await loginWithAzure(orgId);
      if (error) { setServerError(error); return; }
      if (!loggedInUser) return;
      setUser(loggedInUser);
      const dest = loggedInUser.role === 'admin' ? '/admin' : (from === '/admin' ? '/' : from);
      navigate(dest, { replace: true });
    } finally {
      setAzureLoadingOrg(null);
    }
  };

  const isAzureLoading = azureLoadingOrg !== null;
  const isBusy = isSubmitting || isAzureLoading;

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">

      {/* ── Left: video panel (hidden on mobile, visible lg+) ── */}
      <div className="hidden lg:flex relative lg:w-[58%] xl:w-[62%] overflow-hidden bg-black">
        <video
          ref={videoRef}
          src={iwosanVideo}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          className="absolute inset-0 h-full w-full object-cover"
        />

        {/* Gradient overlay — darkens edges so text is legible */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-black/60 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />

        {/* Branding overlay at bottom-left */}
        <div className="absolute bottom-10 left-10 right-10 text-white">
          <p className="text-[11px] uppercase tracking-[0.35em] text-white/60 mb-2 font-medium">
            Iwosan Innovation Hub
          </p>
          <h2 className="text-3xl xl:text-4xl font-bold leading-tight tracking-tight drop-shadow-lg">
            Advancing Healthcare<br />Innovation in Africa
          </h2>
          <p className="text-sm text-white/60 mt-3 leading-relaxed max-w-sm">
            A collaborative platform for Iwosan Group staff and partners.
          </p>
        </div>
      </div>

      {/* ── Right: form panel ── */}
      <div className="flex-1 flex flex-col items-center justify-center bg-background px-6 py-12 sm:px-10 lg:px-12 xl:px-16 min-h-screen lg:min-h-0">

        {/* Mobile-only: subtle brand line above form */}
        <div className="lg:hidden text-center mb-10">
          <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground font-medium">
            Iwosan Innovation Hub
          </p>
          <h1 className="text-2xl font-bold text-foreground mt-1 tracking-tight">Staff Portal</h1>
        </div>

        <div className="w-full max-w-sm">
          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground tracking-tight">Welcome back</h2>
            <p className="text-sm text-muted-foreground mt-1">Sign in to access your portal</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@iwosaninnovationhub.com"
                autoComplete="email"
                autoFocus
                {...register('email')}
                className={`h-11 ${errors.email ? 'border-destructive focus-visible:ring-destructive' : ''}`}
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  {...register('password')}
                  className={`h-11 pr-10 ${errors.password ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>

            {/* Server error */}
            {serverError && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2.5">
                <p className="text-sm text-destructive">{serverError}</p>
              </div>
            )}

            {/* Submit */}
            <Button type="submit" className="w-full h-11 font-semibold" disabled={isBusy}>
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Signing in…
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <LogIn className="h-4 w-4" />
                  Sign In
                </span>
              )}
            </Button>

            {/* Divider */}
            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/60" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-background px-2 text-muted-foreground">or continue with Microsoft</span>
              </div>
            </div>

            {/* Azure AD org dropdown */}
            {isAzureLoading ? (
              <div className="w-full h-11 flex items-center justify-center gap-3 rounded-md border border-border bg-muted/40 text-sm text-muted-foreground">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent/50 border-t-transparent" />
                Connecting to Microsoft…
              </div>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    disabled={isBusy}
                    className="w-full h-11 flex items-center justify-between gap-3 rounded-md border border-border bg-background px-4 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                  >
                    <span className="flex items-center gap-2.5">
                      <MicrosoftLogo />
                      Sign in with Microsoft
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="w-[var(--radix-dropdown-menu-trigger-width)]">
                  <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                    Select your organisation
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {AZURE_ORGS.map((org) => (
                    <DropdownMenuItem
                      key={org.id}
                      onSelect={() => handleAzureLogin(org.id)}
                      className="cursor-pointer"
                    >
                      {org.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </form>

          <p className="text-center text-xs text-muted-foreground mt-10">
            © {new Date().getFullYear()} Iwosan Innovation Hub · All rights reserved
          </p>
        </div>
      </div>
    </div>
  );
}

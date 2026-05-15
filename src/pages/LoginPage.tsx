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
import iwosanVideo from '@/assets/iwosan_vision_values_1080p.webm';
import iwosanLogo from '@/assets/iwosan_logo.webp';

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

  // Ensure video is muted and plays immediately — React doesn't reliably sync the muted prop to the DOM
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
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
    <div className="relative min-h-screen overflow-hidden bg-black">

      {/* ── Full-screen background video ── */}
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

      {/* Layered overlays for depth and readability */}
      <div className="absolute inset-0 bg-black/55 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20 pointer-events-none" />

      {/* ── Page content (sits above video) ── */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-12">

        {/* Branding above card */}
        <div className="text-center mb-7 flex flex-col items-center gap-3">
          <img
            src={iwosanLogo}
            alt="Iwosan"
            className="h-10 w-auto drop-shadow-lg"
          />
          <p className="text-[20px] uppercase tracking-[0.4em] text-white/50 font-medium">
            Innovation Hub
          </p>
        </div>

        {/* ── Glass form card ── */}
        <div className="w-full max-w-sm rounded-2xl border border-white/15 bg-white/[0.09] backdrop-blur-2xl shadow-2xl shadow-black/40 px-7 py-8">

          <div className="mb-6">
            <h2 className="text-xl font-bold text-white tracking-tight">Welcome back</h2>
            <p className="text-sm text-white/55 mt-1">Sign in to access your account</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-white/80">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@iwosaninnovationhub.com"
                autoComplete="email"
                autoFocus
                {...register('email')}
                className={`h-11 bg-white/10 border-white/20 text-white placeholder:text-white/30 focus-visible:border-white/50 focus-visible:ring-white/20 ${errors.email ? 'border-red-400/60' : ''}`}
              />
              {errors.email && (
                <p className="text-xs text-red-300">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium text-white/80">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  {...register('password')}
                  className={`h-11 pr-10 bg-white/10 border-white/20 text-white placeholder:text-white/30 focus-visible:border-white/50 focus-visible:ring-white/20 ${errors.password ? 'border-red-400/60' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-300">{errors.password.message}</p>
              )}
            </div>

            {/* Server error */}
            {serverError && (
              <div className="rounded-lg bg-red-500/15 border border-red-400/30 px-3 py-2.5">
                <p className="text-sm text-red-300">{serverError}</p>
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
                <span className="w-full border-t border-white/15" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-transparent px-2 text-white/40">or continue with Microsoft</span>
              </div>
            </div>

            {/* Azure AD org dropdown */}
            {isAzureLoading ? (
              <div className="w-full h-11 flex items-center justify-center gap-3 rounded-md border border-white/15 bg-white/10 text-sm text-white/60">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-transparent" />
                Connecting to Microsoft…
              </div>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    disabled={isBusy}
                    className="w-full h-11 flex items-center justify-between gap-3 rounded-md border border-white/15 bg-white/10 px-4 text-sm font-medium text-white/80 transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 disabled:pointer-events-none disabled:opacity-40"
                  >
                    <span className="flex items-center gap-2.5">
                      <MicrosoftLogo />
                      Sign in with Microsoft
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 text-white/40 shrink-0" />
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
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-white/30 mt-8">
          © {new Date().getFullYear()} Iwosan Innovation Hub · All rights reserved
        </p>
      </div>
    </div>
  );
}

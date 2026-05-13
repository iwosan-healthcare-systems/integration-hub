import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ChevronDown, Eye, EyeOff, Lock, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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
import iwosanLogo from '@/assets/iwosan_logo.webp';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

const MicrosoftLogo = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 21 21" width="18" height="18" aria-hidden="true" className="shrink-0">
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
      if (error) {
        setServerError(error);
        return;
      }
      if (!loggedInUser) return; // user cancelled popup
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
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        {/* Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-64 h-16 rounded-2xl bg-accent/10 border border-accent/20 mb-4">
            <img src={iwosanLogo} alt="Iwosan" className="h-10 w-auto" />
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Innovation Hub
          </h1>
          <p className="text-sm text-muted-foreground mt-1 uppercase tracking-widest">
            Staff Portal
          </p>
        </div>

        <Card className="border-border/60 shadow-xl">
          <CardHeader className="pb-2 pt-6 px-6">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-accent" />
              <h2 className="text-base font-semibold text-foreground">Sign In to Your Account</h2>
            </div>
          </CardHeader>

          <CardContent className="px-6 pb-6 pt-4">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@iwosaninnovationhub.com"
                  autoComplete="email"
                  autoFocus
                  {...register('email')}
                  className={errors.email ? 'border-destructive focus-visible:ring-destructive' : ''}
                />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    {...register('password')}
                    className={`pr-10 ${errors.password ? 'border-destructive focus-visible:ring-destructive' : ''}`}
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

              <Button type="submit" className="w-full mt-2" disabled={isBusy}>
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
              <div className="relative my-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border/60" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-card px-2 text-muted-foreground">or continue with Microsoft</span>
                </div>
              </div>

              {/* Microsoft / Azure AD — org dropdown */}
              {isAzureLoading ? (
                <div className="w-full flex items-center justify-center gap-3 rounded-md border border-accent/20 bg-accent/10 px-4 py-2.5 text-sm font-medium text-muted-foreground">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent/40 border-t-transparent" />
                  Connecting to Microsoft…
                </div>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      disabled={isBusy}
                      className="w-full flex items-center justify-between gap-3 rounded-md border border-accent/20 bg-accent/10 px-4 py-2.5 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                    >
                      <span className="flex items-center gap-3">
                        <MicrosoftLogo />
                        Sign in with Microsoft
                      </span>
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="center"
                    className="w-[var(--radix-dropdown-menu-trigger-width)]"
                  >
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
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          © {new Date().getFullYear()} Iwosan Innovation Hub · All rights reserved
        </p>
      </div>
    </div>
  );
}

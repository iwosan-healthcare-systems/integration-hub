import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle2, Eye, EyeOff, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { changePassword } from '@/services/authService';

const schema = z
  .object({
    newPassword: z
      .string()
      .min(8, 'At least 8 characters required')
      .regex(/[A-Z]/, 'Must include an uppercase letter')
      .regex(/[a-z]/, 'Must include a lowercase letter')
      .regex(/[0-9]/, 'Must include a number'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type FormData = z.infer<typeof schema>;

const requirements = [
  'At least 8 characters',
  'One uppercase letter (A–Z)',
  'One lowercase letter (a–z)',
  'One number (0–9)',
];

export function ChangePasswordModal() {
  const { user, setUser } = useAuth();
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  if (!user?.isFirstLogin) return null;

  const onSubmit = async (data: FormData) => {
    setServerError('');
    setIsSubmitting(true);
    try {
      const { error } = await changePassword(data.newPassword, data.confirmPassword);
      if (error) {
        setServerError(error);
        return;
      }
      setUser({ ...user, isFirstLogin: false });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    /* Full-screen overlay — cannot be dismissed until password is changed */
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-background shadow-2xl">
        {/* Header */}
        <div className="flex items-start gap-3 border-b border-border/60 p-6">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10">
            <KeyRound className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">Set Your Password</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Welcome, {user.name}. Please set a personal password before you continue.
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          {/* New Password */}
          <div className="space-y-1.5">
            <Label htmlFor="cp-new">New Password</Label>
            <div className="relative">
              <Input
                id="cp-new"
                type={showNew ? 'text' : 'password'}
                placeholder="Create a strong password"
                autoFocus
                {...register('newPassword')}
                className={`pr-10 ${errors.newPassword ? 'border-destructive' : ''}`}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowNew((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.newPassword && (
              <p className="text-xs text-destructive">{errors.newPassword.message}</p>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <Label htmlFor="cp-confirm">Confirm Password</Label>
            <div className="relative">
              <Input
                id="cp-confirm"
                type={showConfirm ? 'text' : 'password'}
                placeholder="Confirm your password"
                {...register('confirmPassword')}
                className={`pr-10 ${errors.confirmPassword ? 'border-destructive' : ''}`}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
            )}
          </div>

          {/* Requirements */}
          <div className="rounded-lg bg-muted/50 border border-border/40 p-3 space-y-1.5">
            <p className="text-xs font-medium text-foreground">Password requirements:</p>
            <ul className="space-y-1">
              {requirements.map((req) => (
                <li key={req} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-3 w-3 shrink-0 text-accent/60" />
                  {req}
                </li>
              ))}
            </ul>
          </div>

          {/* Server error */}
          {serverError && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2.5">
              <p className="text-sm text-destructive">{serverError}</p>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Saving…
              </span>
            ) : (
              'Set Password & Continue'
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}

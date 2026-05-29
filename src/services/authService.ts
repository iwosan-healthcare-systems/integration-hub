import type { AuthenticationResult } from '@azure/msal-browser';
import { getMsalInstance, clearAllMsalCaches } from '@/lib/msalConfig';

export interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  isFirstLogin: boolean;
  isActive: boolean;
  authProvider: string;
}

export interface AdminUser extends User {
  authProvider: string;
  createdAt: string;
  updatedAt: string;
}

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<{ data: T | null; error: string | null }> {
  try {
    const res = await fetch(`${API_BASE}/api${path}`, {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      ...options,
    });
    const json = await res.json();
    if (!res.ok) return { data: null, error: json.error || 'Request failed' };
    return { data: json as T, error: null };
  } catch {
    return { data: null, error: 'Network error. Please try again.' };
  }
}

// ── Auth ──────────────────────────────────────────────────────────────────

export async function loginUser(
  email: string,
  password: string
): Promise<{ user: User | null; error: string | null }> {
  const { data, error } = await apiFetch<{ user: User }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  return { user: data?.user ?? null, error };
}

export async function logoutUser(): Promise<void> {
  await apiFetch('/auth/logout', { method: 'POST' });
}

export async function getMe(): Promise<User | null> {
  const { data } = await apiFetch<{ user: User }>('/auth/me');
  return data?.user ?? null;
}

export async function changePassword(
  newPassword: string,
  confirmPassword: string
): Promise<{ error: string | null }> {
  const { error } = await apiFetch('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ newPassword, confirmPassword }),
  });
  return { error };
}

export async function clearAzureSession(): Promise<void> {
  try {
    await clearAllMsalCaches();
  } catch { /* ignore */ }
}

export async function loginWithAzure(
  orgId: string
): Promise<{ user: User | null; error: string | null }> {
  try {
    const msal = await getMsalInstance(orgId);
    const popupRequest = { scopes: ['openid', 'profile', 'email'], prompt: 'login' as const };

    let result: AuthenticationResult;
    try {
      result = await msal.loginPopup(popupRequest);
    } catch (firstErr) {
      // interaction_in_progress means stale sessionStorage state — clear it and
      // retry once transparently so the user never has to click a second time.
      if (firstErr instanceof Error && firstErr.message.includes('interaction_in_progress')) {
        await msal.handleRedirectPromise().catch(() => {});
        result = await msal.loginPopup(popupRequest);
      } else {
        throw firstErr;
      }
    }

    if (!result.idToken) throw new Error('No ID token received from Microsoft');

    const { data, error } = await apiFetch<{ user: User }>('/auth/azure', {
      method: 'POST',
      body: JSON.stringify({ idToken: result.idToken, orgId }),
    });
    return { user: data?.user ?? null, error };
  } catch (err) {
    if (err instanceof Error) {
      if (err.message.includes('user_cancelled') || err.message.includes('access_denied')) {
        return { user: null, error: null };
      }
      if (err.message.includes('popup_window_error')) {
        return { user: null, error: 'Popup was blocked. Please allow popups for this site and try again.' };
      }
    }
    return { user: null, error: 'Microsoft sign-in failed. Please try again.' };
  }
}

// ── Admin ─────────────────────────────────────────────────────────────────

export async function listUsers(): Promise<{ users: AdminUser[] | null; error: string | null }> {
  const { data, error } = await apiFetch<{ users: AdminUser[] }>('/admin/users');
  return { users: data?.users ?? null, error };
}

export async function updateUser(
  id: number,
  fields: { name?: string; role?: string; isActive?: boolean }
): Promise<{ user: User | null; error: string | null }> {
  const { data, error } = await apiFetch<{ user: User }>(`/admin/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(fields),
  });
  return { user: data?.user ?? null, error };
}

export async function deleteUser(id: number): Promise<{ error: string | null }> {
  const { error } = await apiFetch(`/admin/users/${id}`, { method: 'DELETE' });
  return { error };
}

export async function resetUserPassword(
  id: number
): Promise<{ temporaryPassword: string | null; error: string | null }> {
  const { data, error } = await apiFetch<{ temporaryPassword: string }>(
    `/admin/users/${id}/reset-password`,
    { method: 'POST' }
  );
  return { temporaryPassword: data?.temporaryPassword ?? null, error };
}

export async function createUser(
  email: string,
  name: string,
  role: string
): Promise<{ user: User | null; temporaryPassword: string | null; error: string | null }> {
  const { data, error } = await apiFetch<{ user: User; temporaryPassword: string }>(
    '/admin/create-user',
    { method: 'POST', body: JSON.stringify({ email, name, role }) }
  );
  return { user: data?.user ?? null, temporaryPassword: data?.temporaryPassword ?? null, error };
}

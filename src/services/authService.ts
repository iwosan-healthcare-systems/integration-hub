export interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  isFirstLogin: boolean;
  isActive: boolean;
}

export interface AdminUser extends User {
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

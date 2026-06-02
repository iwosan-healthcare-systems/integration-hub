import { useEffect, useState } from 'react';
import {
  Search, Plus, MoreHorizontal, RefreshCw, UserCheck, UserX,
  Trash2, Pencil, X, Copy, Check, KeyRound
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { listUsers, updateUser, deleteUser, createUser, resetUserPassword, type AdminUser } from '@/services/authService';

function roleBadge(role: string) {
  if (role === 'admin') return <Badge className="bg-accent/20 text-accent border-accent/30 text-[10px]">Admin</Badge>;
  if (role === 'manager') return <Badge className="bg-blue-500/20 text-blue-600 border-blue-400/30 text-[10px]">Manager</Badge>;
  return <Badge variant="secondary" className="text-[10px]">User</Badge>;
}

function StatusBadge({ active }: { active: boolean }) {
  return active
    ? <Badge className="bg-green-500/15 text-green-700 border-green-400/30 text-[10px]">Active</Badge>
    : <Badge variant="destructive" className="text-[10px]">Inactive</Badge>;
}

// ── Create User Modal ──────────────────────────────────────────────────────

interface CreateUserModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (user: AdminUser, tempPassword: string) => void;
}

function CreateUserModal({ open, onClose, onCreated }: CreateUserModalProps) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('user');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const reset = () => { setEmail(''); setName(''); setRole('user'); setError(''); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { user, temporaryPassword, error: err } = await createUser(email.trim(), name.trim(), role);
    setLoading(false);
    if (err) { setError(err); return; }
    if (user && temporaryPassword) {
      onCreated({ ...user, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, temporaryPassword);
      reset();
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); onClose(); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New User</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="c-name">Full Name</Label>
            <Input id="c-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-email">Email Address</Label>
            <Input id="c-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@example.com" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-role">Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger id="c-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User — View-only access</SelectItem>
                <SelectItem value="manager">Manager — Extended access</SelectItem>
                <SelectItem value="admin">Admin — Full control</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { reset(); onClose(); }}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? <span className="flex items-center gap-2"><span className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />Creating…</span> : 'Create User'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Password Display Modal ─────────────────────────────────────────────────

function PasswordModal({ password, name, onClose }: { password: string; name: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>User Created</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <p className="text-sm text-muted-foreground">
            Share this temporary password with <strong>{name}</strong> securely. It will not be shown again.
          </p>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-2.5">
            <code className="flex-1 text-sm font-mono text-foreground break-all">{password}</code>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={copy}>
              {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">The user will be prompted to change their password on first login.</p>
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Edit User Modal ────────────────────────────────────────────────────────

interface EditModalProps {
  user: AdminUser;
  onClose: () => void;
  onSaved: (updated: AdminUser) => void;
}

function EditUserModal({ user, onClose, onSaved }: EditModalProps) {
  const [name, setName] = useState(user.name);
  const [role, setRole] = useState(user.role);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { user: updated, error: err } = await updateUser(user.id, { name: name.trim(), role });
    setLoading(false);
    if (err) { setError(err); return; }
    if (updated) {
      onSaved({ ...user, name: updated.name, role: updated.role });
      onClose();
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="e-name">Full Name</Label>
            <Input id="e-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input value={user.email} disabled className="opacity-60" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="e-role">Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger id="e-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User — View-only access</SelectItem>
                <SelectItem value="manager">Manager — Extended access</SelectItem>
                <SelectItem value="admin">Admin — Full control</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? <span className="flex items-center gap-2"><span className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />Saving…</span> : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [globalError, setGlobalError] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [newPassword, setNewPassword] = useState<{ password: string; name: string } | null>(null);
  const [editTarget, setEditTarget] = useState<AdminUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    setGlobalError('');
    const { users: data, error } = await listUsers();
    if (error) setGlobalError(error);
    else setUsers(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.role.toLowerCase().includes(search.toLowerCase())
  );

  const handleToggleActive = async (u: AdminUser) => {
    setActionLoading(u.id);
    const { user: updated, error } = await updateUser(u.id, { isActive: !u.isActive });
    setActionLoading(null);
    if (error) { setGlobalError(error); return; }
    if (updated) setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, isActive: updated.isActive } : x)));
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setActionLoading(deleteTarget.id);
    const { error } = await deleteUser(deleteTarget.id);
    setActionLoading(null);
    if (error) { setGlobalError(error); setDeleteTarget(null); return; }
    setUsers((prev) => prev.filter((x) => x.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  const handleResetPassword = async (u: AdminUser) => {
    setActionLoading(u.id);
    const { temporaryPassword, error } = await resetUserPassword(u.id);
    setActionLoading(null);
    if (error) { setGlobalError(error); return; }
    if (temporaryPassword) setNewPassword({ password: temporaryPassword, name: u.name });
  };

  const handleCreated = (user: AdminUser, tempPassword: string) => {
    setUsers((prev) => [user, ...prev]);
    setNewPassword({ password: tempPassword, name: user.name });
  };

  const handleSaved = (updated: AdminUser) => {
    setUsers((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
  };

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Users</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{users.length} total account{users.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add User
          </Button>
        </div>
      </div>

      {globalError && (
        <div className="flex items-center justify-between rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
          {globalError}
          <button type="button" onClick={() => setGlobalError('')} aria-label="Dismiss error">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, or role…"
          className="pl-9"
        />
      </div>

      {/* Table */}
      <Card className="border-border/60">
        {/* Column headings */}
        <div className="flex items-center gap-4 px-5 py-2.5 border-b border-border/60 bg-muted/50">
          {/* Avatar spacer */}
          <div className="h-4 w-8 shrink-0" />
          {/* User */}
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">User</span>
          </div>
          {/* Role & Status */}
          <div className="hidden sm:block shrink-0 w-32">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Role & Status</span>
          </div>
          {/* Auth */}
          <div className="hidden lg:block shrink-0 w-24">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Auth</span>
          </div>
          {/* Joined */}
          <div className="hidden md:block w-24 shrink-0 text-right">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Joined</span>
          </div>
          {/* Last Sign In */}
          <div className="hidden xl:block w-28 shrink-0 text-right">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Last Sign In</span>
          </div>
          {/* Actions spacer */}
          <div className="w-7 shrink-0" />
        </div>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-0">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-3.5 border-b border-border/40 last:border-0">
                  <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 w-36 rounded bg-muted animate-pulse" />
                    <div className="h-3 w-48 rounded bg-muted animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground px-5 py-8 text-center">
              {search ? `No users matching "${search}".` : 'No users yet.'}
            </p>
          ) : (
            <div>
              {filtered.map((u, idx) => (
                <div
                  key={u.id}
                  className={`flex items-center gap-4 px-5 py-3.5 hover:bg-muted/40 transition-colors ${idx < filtered.length - 1 ? 'border-b border-border/40' : ''}`}
                >
                  {/* Avatar */}
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 font-semibold text-sm ${u.isActive ? 'bg-accent/15 text-accent' : 'bg-muted text-muted-foreground'}`}>
                    {u.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Identity */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{u.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    {u.isFirstLogin && u.authProvider !== 'azure' && (
                      <p className="text-[10px] text-amber-600 font-medium mt-0.5">Pending first login</p>
                    )}
                  </div>

                  {/* Badges */}
                  <div className="hidden sm:flex items-center gap-2 shrink-0 w-32">
                    {roleBadge(u.role)}
                    <StatusBadge active={u.isActive} />
                  </div>

                  {/* Auth provider */}
                  <div className="hidden lg:block shrink-0 w-24">
                    {u.authProvider === 'azure' ? (
                      <Badge variant="outline" className="text-[10px] text-blue-500 border-blue-400/40 gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 21 21" width="9" height="9" className="shrink-0">
                          <rect x="1" y="1" width="9" height="9" fill="#f25022" />
                          <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
                          <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
                          <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
                        </svg>
                        Microsoft
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-muted-foreground border-border/60">
                        Local
                      </Badge>
                    )}
                  </div>

                  {/* Joined */}
                  <span className="hidden md:block text-xs text-muted-foreground w-24 shrink-0 text-right">
                    {new Date(u.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}
                  </span>

                  {/* Last Sign In */}
                  <span className="hidden xl:block text-xs text-muted-foreground w-28 shrink-0 text-right">
                    {u.lastSignInAt
                      ? new Date(u.lastSignInAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })
                      : <span className="text-muted-foreground/50 italic">Never</span>}
                  </span>

                  {/* Actions menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 text-muted-foreground"
                        disabled={actionLoading === u.id}
                      >
                        {actionLoading === u.id
                          ? <span className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          : <MoreHorizontal className="h-4 w-4" />}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem onClick={() => setEditTarget(u)}>
                        <Pencil className="h-3.5 w-3.5 mr-2" /> Edit user
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleToggleActive(u)}>
                        {u.isActive
                          ? <><UserX className="h-3.5 w-3.5 mr-2" /> Deactivate</>
                          : <><UserCheck className="h-3.5 w-3.5 mr-2" /> Activate</>}
                      </DropdownMenuItem>
                      {u.authProvider !== 'azure' && (
                        <DropdownMenuItem onClick={() => handleResetPassword(u)}>
                          <KeyRound className="h-3.5 w-3.5 mr-2" /> Reset password
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setDeleteTarget(u)}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete user
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <CreateUserModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={handleCreated} />

      {newPassword && (
        <PasswordModal
          password={newPassword.password}
          name={newPassword.name}
          onClose={() => setNewPassword(null)}
        />
      )}

      {editTarget && (
        <EditUserModal user={editTarget} onClose={() => setEditTarget(null)} onSaved={handleSaved} />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deleteTarget?.name}</strong> ({deleteTarget?.email}). This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

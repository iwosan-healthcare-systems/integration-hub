import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, RefreshCw, X, ImageIcon, Images, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { GalleryField } from '@/components/cms/GalleryField';
import { PreviewDialog } from '@/components/cms/previews/PreviewDialog';
import { PicturePreviewCard } from '@/components/cms/previews/PreviewCards';
import {
  getPictureLibrary, createPicture, updatePicture, deletePicture,
  type PictureLibraryItem, type PictureLibraryInput,
} from '@/services/cmsService';

// ── Picture Form Modal ─────────────────────────────────────────────────────
// Each entry is an "album" — one title/description with one or more photos.

interface PictureFormProps {
  item?: PictureLibraryItem;
  onClose: () => void;
  onSaved: (item: PictureLibraryItem) => void;
}

function PictureFormModal({ item, onClose, onSaved }: PictureFormProps) {
  const isEdit = !!item;
  const [form, setForm] = useState<PictureLibraryInput>({
    title: item?.title ?? '',
    description: item?.description ?? '',
    images: item?.images ?? [],
    sortOrder: item?.sortOrder ?? 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);

  function set<K extends keyof PictureLibraryInput>(field: K, value: PictureLibraryInput[K]) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.images.filter(Boolean).length === 0) { setError('At least one image is required.'); return; }
    setLoading(true);
    setError('');
    const result = isEdit ? await updatePicture(item!.id, form) : await createPicture(form);
    setLoading(false);
    if (result.error) { setError(result.error); return; }
    onSaved(result.picture!);
    onClose();
  }

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Album' : 'Add Album'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">

          <div className="space-y-1.5">
            <Label htmlFor="p-title">Title</Label>
            <Input id="p-title" value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. NeuroSurgery" required />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="p-desc">Description</Label>
            <textarea
              id="p-desc"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              placeholder="e.g. View images from this event…"
            />
          </div>

          <GalleryField
            value={form.images}
            onChange={(v) => set('images', v)}
            label="Pictures"
            hint="all photos uploaded here are shown together under this title"
            addButtonLabel="Upload picture"
            enableLibraryPicker={false}
          />

          <div className="space-y-1.5">
            <Label htmlFor="p-order">Sort Order</Label>
            <Input id="p-order" type="number" min={0} value={form.sortOrder} onChange={(e) => set('sortOrder', parseInt(e.target.value) || 0)} />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter className="sm:justify-between">
            <Button type="button" variant="outline" className="gap-2" onClick={() => setPreviewOpen(true)}>
              <Eye className="h-3.5 w-3.5" />Preview
            </Button>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={loading}>
                {loading
                  ? <span className="flex items-center gap-2"><span className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />{isEdit ? 'Saving…' : 'Creating…'}</span>
                  : isEdit ? 'Save Changes' : 'Add Picture'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>

      <PreviewDialog open={previewOpen} onOpenChange={setPreviewOpen} className="sm:max-w-sm">
        <PicturePreviewCard picture={form} />
      </PreviewDialog>
    </Dialog>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function PictureLibraryManagePage() {
  const [pictures, setPictures] = useState<PictureLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalError, setGlobalError] = useState('');
  const [formTarget, setFormTarget] = useState<PictureLibraryItem | 'new' | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PictureLibraryItem | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    setGlobalError('');
    const { pictures: data, error } = await getPictureLibrary();
    if (error) setGlobalError(error);
    else setPictures(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSaved = (saved: PictureLibraryItem) => {
    setPictures((prev) => {
      const idx = prev.findIndex((p) => p.id === saved.id);
      return idx >= 0 ? prev.map((p) => (p.id === saved.id ? saved : p)) : [saved, ...prev];
    });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setActionLoading(deleteTarget.id);
    const { error } = await deletePicture(deleteTarget.id);
    setActionLoading(null);
    if (error) { setGlobalError(error); setDeleteTarget(null); return; }
    setPictures((prev) => prev.filter((p) => p.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Picture Library</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{pictures.length} album{pictures.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setFormTarget('new')} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Album
          </Button>
        </div>
      </div>

      {globalError && (
        <div className="flex items-center justify-between rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
          {globalError}
          <button type="button" aria-label="Dismiss error" onClick={() => setGlobalError('')}><X className="h-3.5 w-3.5" /></button>
        </div>
      )}

      <Card className="border-border/60 overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="aspect-square rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : pictures.length === 0 ? (
            <p className="text-sm text-muted-foreground px-5 py-8 text-center">No albums yet. Click "Add Album" to get started.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5">
              {pictures.map((pic) => {
                const cover = pic.images[0];
                return (
                  <div key={pic.id} className="group relative rounded-lg overflow-hidden border border-border/60 bg-muted/30">
                    <div className="aspect-square bg-muted flex items-center justify-center">
                      {cover
                        ? <img src={cover} alt={pic.title} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        : <ImageIcon className="h-6 w-6 text-muted-foreground/40" />}
                    </div>
                    {pic.images.length > 1 && (
                      <span className="absolute top-1.5 right-1.5 inline-flex items-center gap-1 rounded-full bg-black/70 text-white text-[10px] font-semibold px-1.5 py-0.5">
                        <Images className="h-2.5 w-2.5" />{pic.images.length}
                      </span>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-end">
                      <div className="w-full p-2.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-xs font-medium text-white truncate">{pic.title}</p>
                        <div className="flex items-center gap-1 mt-1.5">
                          <Button aria-label="Edit album" variant="secondary" size="icon" className="h-6 w-6" onClick={() => setFormTarget(pic)} disabled={actionLoading === pic.id}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button aria-label="Delete album" variant="secondary" size="icon" className="h-6 w-6 hover:text-destructive" onClick={() => setDeleteTarget(pic)} disabled={actionLoading === pic.id}>
                            {actionLoading === pic.id
                              ? <span className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                              : <Trash2 className="h-3 w-3" />}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {formTarget !== null && (
        <PictureFormModal
          item={formTarget === 'new' ? undefined : formTarget}
          onClose={() => setFormTarget(null)}
          onSaved={handleSaved}
        />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete album?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>"{deleteTarget?.title}"</strong> and all its photos. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

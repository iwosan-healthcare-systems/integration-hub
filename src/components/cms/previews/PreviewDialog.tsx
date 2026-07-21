import type { ReactNode } from "react";
import { Eye } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

interface PreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  className?: string;
}

// Shared chrome for CMS "Preview" dialogs — a small muted label plus
// whatever card/body the content type wants to render.
export function PreviewDialog({ open, onOpenChange, children, className }: PreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={className ?? "sm:max-w-md"}>
        <DialogTitle className="flex items-center gap-2 text-xs font-sans font-semibold uppercase tracking-widest text-muted-foreground">
          <Eye className="h-3.5 w-3.5" />
          Preview — unsaved changes
        </DialogTitle>
        {children}
      </DialogContent>
    </Dialog>
  );
}

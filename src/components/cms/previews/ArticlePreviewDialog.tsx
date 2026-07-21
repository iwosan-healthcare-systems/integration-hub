import { Eye } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ArticleBody, type ArticleBodyProps } from "@/components/ArticleBody";

interface ArticlePreviewDialogProps extends ArticleBodyProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Renders the exact same ArticleBody used on the public article page, fed
// with live (unsaved) form state — what an editor sees here is what
// publishing will produce.
export function ArticlePreviewDialog({ open, onOpenChange, ...body }: ArticlePreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto p-0 gap-0">
        <DialogTitle className="flex items-center gap-2 px-6 pt-6 pb-4 text-xs font-sans font-semibold uppercase tracking-widest text-muted-foreground">
          <Eye className="h-3.5 w-3.5" />
          Preview — unsaved changes
        </DialogTitle>
        <div className="pb-8">
          <ArticleBody {...body} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

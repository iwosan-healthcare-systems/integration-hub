import { useState } from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { Sparkles, Check, X, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { aiAssist, type AiAssistContentType, type AiAssistField } from "@/services/cmsService";

// Radix's PopoverClose isn't re-exported by the shared ui/popover.tsx wrapper,
// so this small local wrapper closes the popover without needing controlled
// open state at every call site.
function PopoverTriggerClose() {
  return (
    <PopoverPrimitive.Close asChild>
      <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 text-xs">
        <X className="h-3 w-3" />Discard
      </Button>
    </PopoverPrimitive.Close>
  );
}

interface AiAssistButtonProps {
  contentType: AiAssistContentType;
  field: AiAssistField;
  // Current field value — an empty field generates and fills directly; a
  // field with existing text is rewritten and shown in a preview the editor
  // must accept before it touches the field.
  value: string;
  // Other filled-in fields from the same form (title, category, etc.),
  // used as context so the generated text is relevant, not generic.
  context?: Record<string, string | undefined>;
  onGenerated: (text: string) => void;
  label?: string;
}

export function AiAssistButton({ contentType, field, value, context = {}, onGenerated, label }: AiAssistButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<string | null>(null);

  const hasExisting = !!value.trim();

  async function run() {
    setError("");
    setPreview(null);
    setLoading(true);
    const cleanContext = Object.fromEntries(
      Object.entries(context).filter((e): e is [string, string] => typeof e[1] === "string" && e[1].trim().length > 0)
    );
    const { text, error: err } = await aiAssist({
      contentType,
      field,
      mode: hasExisting ? "rewrite" : "generate",
      existingText: hasExisting ? value : undefined,
      context: cleanContext,
    });
    setLoading(false);
    if (err || !text) {
      setError(err || "Could not generate text.");
      return;
    }
    if (hasExisting) setPreview(text);
    else onGenerated(text);
  }

  function accept() {
    if (preview) onGenerated(preview);
    setPreview(null);
  }

  const triggerButton = (
    <button
      type="button"
      onClick={run}
      disabled={loading}
      aria-label={label ?? (hasExisting ? "Rewrite with AI" : "Generate with AI")}
      title={label ?? (hasExisting ? "Rewrite with AI" : "Generate with AI")}
      className="inline-flex items-center gap-1 text-[10px] font-sans font-semibold text-accent hover:text-accent/80 transition-colors disabled:opacity-50"
    >
      {loading
        ? <span className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
        : <Sparkles className="h-3 w-3" />}
      {loading ? (hasExisting ? "Rewriting…" : "Generating…") : hasExisting ? "Rewrite" : "Generate"}
    </button>
  );

  // Nothing in the field yet: fill directly, no confirmation needed —
  // there's no existing draft that could be lost.
  if (!hasExisting) return triggerButton;

  // Existing text: show the rewrite in a preview the editor accepts or
  // discards, so a good manual draft is never silently overwritten.
  return (
    <Popover onOpenChange={(open) => { if (!open) { setPreview(null); setError(""); } }}>
      <PopoverTrigger asChild>{triggerButton}</PopoverTrigger>
      <PopoverContent align="end" className="w-[calc(100vw-2rem)] max-w-80 space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">AI suggestion</p>
        {loading ? (
          <div className="space-y-1.5">
            <div className="h-3 w-full rounded bg-muted animate-pulse" />
            <div className="h-3 w-4/5 rounded bg-muted animate-pulse" />
            <div className="h-3 w-2/3 rounded bg-muted animate-pulse" />
          </div>
        ) : error ? (
          <p className="text-xs text-destructive">{error}</p>
        ) : preview ? (
          <p className="text-sm text-foreground whitespace-pre-line">{preview}</p>
        ) : null}
        <div className="flex items-center justify-end gap-2 pt-1">
          {!loading && (preview || error) && (
            <Button type="button" variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={run}>
              <RotateCcw className="h-3 w-3" />Try again
            </Button>
          )}
          <PopoverTriggerClose />
          {preview && !loading && (
            <Button type="button" size="sm" className="h-7 gap-1 text-xs" onClick={accept}>
              <Check className="h-3 w-3" />Use this
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

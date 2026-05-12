import { Button } from "@/components/ui/Button";

type SuggestedPromptCardProps = {
  prompt: string;
  onSelect?: (prompt: string) => void;
};

export function SuggestedPromptCard({ onSelect, prompt }: SuggestedPromptCardProps) {
  return (
    <Button
      aria-label={`Use prompt: ${prompt}`}
      className="h-auto w-full justify-between rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-left leading-6 transition-colors hover:bg-[var(--panel)]"
      onClick={() => onSelect?.(prompt)}
      type="button"
      variant="ghost"
    >
      <span className="line-clamp-2 text-sm text-[var(--foreground)]">{prompt}</span>
      <span aria-hidden="true" className="ml-3 shrink-0 inline-flex items-center text-xs text-[var(--accent)]">
        Use →
      </span>
    </Button>
  );
}
